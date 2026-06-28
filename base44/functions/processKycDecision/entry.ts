import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Provider abstraction: switch between manual review and future providers (idanalyzer, sumsub, etc.)
const PROVIDER = 'manual';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAuthorized = ['super_admin', 'bodasure_staff', 'county_admin'].includes(admin.role);
    if (!isAuthorized) return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });

    const { docId, userId, action, reason, provider = PROVIDER } = await req.json();

    if (!docId || !userId || !action) {
      return Response.json({ error: 'Missing required fields: docId, userId, action' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'Action must be "approve" or "reject"' }, { status: 400 });
    }

    if (action === 'reject' && (!reason || reason.trim().length < 10)) {
      return Response.json({ error: 'Rejection reason must be at least 10 characters' }, { status: 400 });
    }

    // County scope check: county_admin can only approve/reject docs for riders in their county
    if (admin.role === 'county_admin') {
      const targetUsers = await base44.asServiceRole.entities.User.filter({ id: userId });
      const targetUser = targetUsers[0];
      if (!targetUser) return Response.json({ error: 'Target rider not found' }, { status: 404 });
      const adminCountyId = admin.scope_entity_id || admin.county_id;
      if (!adminCountyId || targetUser.county_id !== adminCountyId) {
        return Response.json({ error: 'Forbidden: county_admin can only review riders in their own county' }, { status: 403 });
      }
    }

    // Route to provider implementation
    let result;
    if (provider === 'manual') {
      result = await processManualReview(base44, docId, userId, action, reason, admin.id);
    } else {
      return Response.json({ error: `Provider "${provider}" not implemented yet` }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('processKycDecision error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function processManualReview(base44, docId, userId, action, reason, adminId) {
  const doc = await base44.asServiceRole.entities.KycDocument.get(docId);
  if (!doc || doc.user_id !== userId) {
    throw new Error('Document not found or user mismatch');
  }

  const now = new Date().toISOString();

  if (action === 'approve') {
    // Mark this document as approved
    await base44.asServiceRole.entities.KycDocument.update(docId, {
      status: 'approved',
      reviewed_by_id: adminId,
      reviewed_at: now,
      provider_name: 'manual',
    });

    // Check if ALL KycDocuments for this user are now approved
    const allUserDocs = await base44.asServiceRole.entities.KycDocument.filter({ user_id: userId });
    const allApproved = allUserDocs.length > 0 && allUserDocs.every(d => d.status === 'approved');

    let kycStatus = 'pending';
    let walletUpgraded = false;
    let walletTier = 0;

    if (allApproved) {
      // Upgrade user KYC status and wallet tier to 2
      await base44.asServiceRole.entities.User.update(userId, {
        kyc_status: 'verified',
        wallet_tier: 2,
      });
      kycStatus = 'verified';

      // Upgrade wallet tier and activate
      const wallets = await base44.asServiceRole.entities.Wallet.filter({
        user_id: userId,
        entity_type: 'personal',
      });
      if (wallets.length > 0) {
        await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
          tier: 2,
          status: 'active',
        });
        walletTier = 2;
        walletUpgraded = true;
      }
    }

    // Create compliance audit log entry
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: adminId,
      action: 'kyc_document_approved',
      entity_type: 'KycDocument',
      entity_id: docId,
      description: allApproved
        ? `All KYC documents approved. User ${userId} upgraded to Verified (Tier 2).`
        : `KYC document (${doc.document_type}) approved for user ${userId}. Awaiting remaining documents.`,
      new_values: {
        status: 'approved',
        reviewed_by_id: adminId,
        reviewed_at: now,
        rider_id: userId,
      },
    });

    // Send SMS for bike photo approvals
    if (['bike_left', 'bike_rear'].includes(doc.document_type)) {
      await sendBikePhotoSms(base44, userId, 'bike_photo_approved', {});
    }

    return {
      success: true,
      action: 'approve',
      kycStatus,
      walletUpgraded,
      walletTier,
      allApproved,
    };
  } else if (action === 'reject') {
    // Mark document as rejected
    await base44.asServiceRole.entities.KycDocument.update(docId, {
      status: 'rejected',
      rejection_reason: reason.trim(),
      reviewed_by_id: adminId,
      reviewed_at: now,
      provider_name: 'manual',
    });

    // Set user KYC status to rejected
    await base44.asServiceRole.entities.User.update(userId, {
      kyc_status: 'rejected',
    });

    // Create compliance audit log entry for rejection
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: adminId,
      action: 'kyc_document_rejected',
      entity_type: 'KycDocument',
      entity_id: docId,
      description: `KYC document (${doc.document_type}) rejected for user ${userId}. Reason: ${reason.trim()}`,
      new_values: {
        status: 'rejected',
        rejection_reason: reason.trim(),
        reviewed_by_id: adminId,
        reviewed_at: now,
        rider_id: userId,
      },
    });

    // Send SMS for bike photo rejections
    if (['bike_left', 'bike_rear'].includes(doc.document_type)) {
      await sendBikePhotoSms(base44, userId, 'bike_photo_rejected', { reason: reason.trim() });
    }

    return {
      success: true,
      action: 'reject',
      kycStatus: 'rejected',
      walletUpgraded: false,
      walletTier: 0,
    };
  }
}

async function sendBikePhotoSms(base44, userId, templateKey, variables) {
  try {
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    const rider = users[0];
    if (!rider?.phone) {
      console.warn('[sendBikePhotoSms] No phone for user', userId);
      return;
    }

    const templates = await base44.asServiceRole.entities.SmsTemplate.filter({
      template_key: templateKey,
      is_active: true,
    });
    if (templates.length === 0) {
      console.warn('[sendBikePhotoSms] Template not found:', templateKey);
      return;
    }

    let body = templates[0].body;
    const allVars = { name: rider.full_name || 'Rider', ...variables };
    Object.entries(allVars).forEach(([key, value]) => {
      body = body.replace(`{${key}}`, String(value));
    });

    const eventType = templateKey === 'bike_photo_approved' ? 'kyc_approved' : 'kyc_rejected';
    await base44.functions.invoke('sendSms', {
      phone: rider.phone,
      message: body,
      templateKey,
      eventType,
      metadata: { ...allVars, rider_id: userId },
    });
  } catch (e) {
    console.error('Failed to send bike photo SMS:', e.message);
  }
}
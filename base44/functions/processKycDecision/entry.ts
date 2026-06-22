import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Provider abstraction: switch between manual review and future providers (idanalyzer, sumsub, etc.)
const PROVIDER = 'manual';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

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

    // Audit log
    const auditMsg = allApproved
      ? `All KYC documents approved for user ${userId} — upgraded to Verified (Tier 2)`
      : `KYC document (${doc.document_type}) approved for user ${userId}`;
    await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Log: ${auditMsg}`,
    }).catch(() => {});

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

    // Audit log
    const auditMsg = `KYC document (${doc.document_type}) rejected for user ${userId}. Reason: ${reason.trim()}`;
    await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Log: ${auditMsg}`,
    }).catch(() => {});

    return {
      success: true,
      action: 'reject',
      kycStatus: 'rejected',
      walletUpgraded: false,
      walletTier: 0,
    };
  }
}
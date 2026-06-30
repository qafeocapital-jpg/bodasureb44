import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * V2: Process KYC Document Decisions with Provider Abstraction
 * Handles both manual review and automated (ID Analyzer) approvals/rejections.
 *
 * When all required ID docs (id_front, id_back, selfie) are approved and
 * kyc_status becomes 'verified', triggers the full post-accept pipeline:
 *   - Write profile fields from id_extracted_data (full_name, national_id, dob, avatar_url)
 *   - Set verification_complete, wallet_tier=2, docupass_verified_at
 *   - transitionAccountState(KYC_ACCEPTED)
 *   - convertProvisionalPermit
 *   - kyc_approved SMS
 *
 * Payload:
 * - kycDocumentId: ID of KycDocument to approve/reject
 * - decision: 'approved' | 'rejected'
 * - rejectionReason: (optional) reason if rejected
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const userRoles = new Set(user?.roles || []);
    if (user?.role) userRoles.add(user.role);
    if (!userRoles.has('super_admin')) {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const { kycDocumentId, decision, rejectionReason } = await req.json();

    if (!kycDocumentId || !['approved', 'rejected'].includes(decision)) {
      return Response.json({ error: 'Missing or invalid kycDocumentId or decision' }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // Fetch KycDocument
    const kycDoc = await sr.entities.KycDocument.get(kycDocumentId);
    if (!kycDoc) {
      return Response.json({ error: 'KycDocument not found' }, { status: 404 });
    }

    // Fetch User
    const rider = await sr.entities.User.get(kycDoc.user_id);
    if (!rider) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Update KycDocument
    const docUpdateData = {
      status: decision,
      reviewed_by_id: user.id,
      reviewed_at: new Date().toISOString(),
    };
    if (decision === 'rejected' && rejectionReason) {
      docUpdateData.rejection_reason = rejectionReason;
    }

    await sr.entities.KycDocument.update(kycDocumentId, docUpdateData);

    // Determine KYC status based on all documents
    const allDocs = await sr.entities.KycDocument.filter({ user_id: kycDoc.user_id });
    const kyc_status = calculateKycStatus(allDocs);

    // Update User kyc_status
    await sr.entities.User.update(kycDoc.user_id, { kyc_status });

    // If full KYC approval, trigger post-accept pipeline
    if (kyc_status === 'verified') {
      // Parse extracted data to write profile fields
      let extractedData = null;
      try {
        if (rider.id_extracted_data) {
          extractedData = JSON.parse(rider.id_extracted_data);
        }
      } catch (e) {
        console.warn('[processKycDecisionV2] Failed to parse id_extracted_data:', e.message);
      }

      const profileUpdate = {
        kyc_status: 'verified',
        verification_complete: true,
        phone_verified: true,
        wallet_tier: 2,
        docupass_verified_at: new Date().toISOString(),
        kyc_just_approved: true,
      };

      // Write profile fields from extracted data if available
      if (extractedData?.fields) {
        const fv = (key) => extractedData.fields[key]?.value ?? null;
        if (fv('fullName')) {
          profileUpdate.full_name = fv('fullName');
          profileUpdate.id_extracted_name = fv('fullName');
        }
        if (fv('dob')) {
          const dob = normalizeDate(fv('dob'));
          if (dob) {
            profileUpdate.id_extracted_dob = dob;
            profileUpdate.date_of_birth = dob;
          }
        }
        if (fv('documentNumber')) {
          profileUpdate.national_id = fv('documentNumber');
        }
      }

      // Set avatar from selfie KycDocument
      const selfieDoc = allDocs.find(d => d.document_type === 'selfie' && d.file_url);
      if (selfieDoc) {
        profileUpdate.avatar_url = selfieDoc.file_url;
      }

      await sr.entities.User.update(kycDoc.user_id, profileUpdate);

      // Upgrade wallet tier
      const wallets = await sr.entities.Wallet.filter({
        user_id: kycDoc.user_id,
        entity_type: 'personal',
      });
      if (wallets.length > 0) {
        await sr.entities.Wallet.update(wallets[0].id, {
          tier: 2,
          status: 'active',
        });
      }

      // Transition account state
      try {
        await base44.functions.invoke('transitionAccountState', {
          userId: kycDoc.user_id,
          event: 'KYC_ACCEPTED',
          metadata: { source: 'admin_review_approval', adminId: user.id },
        });
      } catch (e) {
        console.error('[processKycDecisionV2] State transition failed:', e.message);
      }

      // Convert provisional permit
      try {
        await base44.functions.invoke('convertProvisionalPermit', { userId: kycDoc.user_id });
      } catch (e) {
        console.error('[processKycDecisionV2] Permit conversion failed:', e.message);
      }

      // Send kyc_approved SMS
      try {
        const templates = await sr.entities.SmsTemplate.filter({
          template_key: 'kyc_approved', is_active: true,
        });
        if (templates.length > 0 && rider.phone) {
          let body = templates[0].body;
          body = body.replace('{name}', rider.id_extracted_name || rider.full_name || 'Rider');
          await base44.functions.invoke('sendSms', {
            phone: rider.phone, message: body, templateKey: 'kyc_approved',
            eventType: 'kyc_approved',
            metadata: { userId: kycDoc.user_id, source: 'admin_review' },
          });
        }
      } catch (e) {
        console.error('[processKycDecisionV2] SMS failed:', e.message);
      }

      await sr.entities.AuditLog.create({
        user_id: user.id,
        action: 'kyc_approved_tier2',
        entity_type: 'User',
        entity_id: kycDoc.user_id,
        description: `KYC approved by admin — Tier 2 unlocked for user ${kycDoc.user_id}`,
      });
    }

    // Create audit log
    await sr.entities.AuditLog.create({
      user_id: user.id,
      action: `kyc_document_${decision}`,
      entity_type: 'KycDocument',
      entity_id: kycDocumentId,
      description: `KYC document ${decision} by admin. User KYC status: ${kyc_status}`,
      new_values: {
        document_status: decision,
        user_kyc_status: kyc_status,
        provider: kycDoc.provider_name || 'manual_review',
      },
    });

    return Response.json({
      success: true,
      decision,
      userKycStatus: kyc_status,
      walletTierUpgraded: kyc_status === 'verified',
    });
  } catch (error) {
    console.error('processKycDecisionV2 error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateKycStatus(documents) {
  if (documents.length === 0) return 'unverified';

  const approved = documents.filter(d => d.status === 'approved').length;
  const rejected = documents.some(d => d.status === 'rejected');

  const requiredDocs = ['id_front', 'id_back', 'selfie'];
  const hasAllRequired = requiredDocs.every(type =>
    documents.some(d => d.document_type === type && d.status === 'approved')
  );

  if (rejected) return 'rejected';
  if (hasAllRequired && approved >= 3) return 'verified';
  return 'pending';
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = String(dateStr).replace(/\//g, '-');
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.substring(0, 10);
  const parts = cleaned.split('-');
  if (parts.length === 3 && parts[2].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return cleaned.substring(0, 10);
}
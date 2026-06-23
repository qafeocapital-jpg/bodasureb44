import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getConfiguredProvider, KYC_PROVIDERS, isAutomatedProvider } from '../lib/kycProviders.js';

/**
 * V2: Process KYC Document Decisions with Provider Abstraction
 * Handles both manual review and automated (ID Analyzer) approvals/rejections.
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
    if (!user?.role || user.role !== 'super_admin') {
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

    // If full KYC approval, trigger Tier 2 wallet upgrade
    if (kyc_status === 'verified') {
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

      // Upgrade user wallet_tier + flag for UI notification
      await sr.entities.User.update(kycDoc.user_id, {
        wallet_tier: 2,
        kyc_just_approved: true,
      });

      // Audit log for Tier 2 upgrade
      await sr.entities.AuditLog.create({
        user_id: user.id,
        action: 'kyc_approved_tier2',
        entity_type: 'User',
        entity_id: kycDoc.user_id,
        description: `KYC approved — Tier 2 unlocked for user ${kycDoc.user_id}`,
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

  // Require ID front, ID back, and selfie to be approved
  const requiredDocs = ['id_front', 'id_back', 'selfie'];
  const hasAllRequired = requiredDocs.every(type =>
    documents.some(d => d.document_type === type && d.status === 'approved')
  );

  if (rejected) return 'rejected';
  if (hasAllRequired && approved >= 3) return 'verified';
  return 'pending';
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * confirmKycDetails — called by the rider after they review and confirm the
 * identity details extracted by IDAnalyzer.
 *
 * Prerequisite: kyc_status === 'pending_confirmation' (set by idAnalyzerCallback
 * on an 'accept' decision).
 *
 * Actions:
 *   1. Set kyc_status='verified', verification_complete=true, wallet_tier=2
 *   2. transitionAccountState(KYC_ACCEPTED)
 *   3. Upgrade personal wallet to tier 2
 *   4. Convert provisional permit to full
 *   5. Push verified ID images to SasaPay (sasapayPersonalKycUpload)
 *   6. Send kyc_approved SMS
 *   7. AuditLog
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const sr = base44.asServiceRole;

    // Fetch fresh user record to validate state
    const freshUser = await sr.entities.User.get(user.id);
    if (!freshUser) return Response.json({ error: 'User not found' }, { status: 404 });

    if (freshUser.kyc_status !== 'pending_confirmation') {
      return Response.json({
        error: 'No pending confirmation. Your verification may already be complete or still in review.',
      }, { status: 400 });
    }

    // 1. Mark verified
    await sr.entities.User.update(user.id, {
      kyc_status: 'verified',
      verification_complete: true,
      phone_verified: true,
      wallet_tier: 2,
      docupass_verified_at: new Date().toISOString(),
      kyc_just_approved: true,
    });

    // 2. Transition account state
    try {
      await base44.functions.invoke('transitionAccountState', {
        userId: user.id,
        event: 'KYC_ACCEPTED',
        metadata: { source: 'user_confirmation' },
      });
    } catch (e) {
      console.error('[confirmKycDetails] State transition failed:', e.message);
    }

    // 3. Upgrade wallet tier
    try {
      const wallets = await sr.entities.Wallet.filter({
        user_id: user.id,
        entity_type: 'personal',
      });
      if (wallets.length > 0) {
        await sr.entities.Wallet.update(wallets[0].id, {
          tier: 2,
          status: 'active',
        });
      }
    } catch (e) {
      console.error('[confirmKycDetails] Wallet upgrade failed:', e.message);
    }

    // 4. Convert provisional permit
    try {
      await base44.functions.invoke('convertProvisionalPermit', { userId: user.id });
    } catch (e) {
      console.error('[confirmKycDetails] Permit conversion failed:', e.message);
    }

    // 5. Push verified ID images to SasaPay
    try {
      const docs = await sr.entities.KycDocument.filter({ user_id: user.id });
      const idAnalyzerDocs = docs.filter(d => d.provider_reference);
      const faceDoc = idAnalyzerDocs.find(d => d.document_type === 'selfie');
      const frontDoc = idAnalyzerDocs.find(d => d.document_type === 'id_front');
      const backDoc = idAnalyzerDocs.find(d => d.document_type === 'id_back');
      if (faceDoc?.file_url && frontDoc?.file_url && backDoc?.file_url) {
        await base44.functions.invoke('sasapayPersonalKycUpload', {
          passportSizePhotoUrl: faceDoc.file_url,
          documentImageFrontUrl: frontDoc.file_url,
          documentImageBackUrl: backDoc.file_url,
        });
      }
    } catch (e) {
      console.error('[confirmKycDetails] SasaPay KYC push failed:', e.message);
    }

    // 6. Send kyc_approved SMS
    try {
      const templates = await sr.entities.SmsTemplate.filter({
        template_key: 'kyc_approved',
        is_active: true,
      });
      if (templates.length > 0 && freshUser.phone) {
        let body = templates[0].body;
        body = body.replace('{name}', freshUser.id_extracted_name || freshUser.full_name || 'Rider');
        await base44.functions.invoke('sendSms', {
          phone: freshUser.phone,
          message: body,
          templateKey: 'kyc_approved',
          eventType: 'kyc_approved',
          metadata: { userId: user.id, source: 'user_confirmation' },
        });
      }
    } catch (e) {
      console.error('[confirmKycDetails] SMS send failed:', e.message);
    }

    // 7. AuditLog
    try {
      await sr.entities.AuditLog.create({
        user_id: user.id,
        action: 'kyc_confirmed_by_user',
        entity_type: 'User',
        entity_id: user.id,
        description: 'User confirmed their identity details. KYC fully verified, Tier 2 unlocked.',
      });
    } catch (e) {
      console.error('[confirmKycDetails] AuditLog failed:', e.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[confirmKycDetails] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
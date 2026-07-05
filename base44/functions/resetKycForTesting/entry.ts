import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Reset KYC for Testing
 * Super-admin only. Clears all KYC/verification data for a rider and
 * restores the account to BASIC_ACTIVE (post-wallet-activation) so the
 * full identity verification flow can be re-tested WITHOUT re-triggering
 * SasaPay wallet creation (phone already registered on SasaPay).
 *
 * Preserves: SasaPay wallet fields, WalletSnapshot, Transactions, Vehicles,
 * GroupMembers, and core profile fields (phone, email, name, county, national_id).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden — super_admin only' }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // 2. Fetch user (wrap in try/catch — invalid ID formats throw at DB layer)
    let users;
    try {
      users = await sr.entities.User.filter({ id: userId });
    } catch {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Delete all KycDocument records
    const docs = await sr.entities.KycDocument.filter({ user_id: userId });
    let clearedDocs = 0;
    if (docs.length > 0) {
      const delRes = await sr.entities.KycDocument.deleteMany({ user_id: userId });
      clearedDocs = docs.length;
    }

    // 4. Patch User — clear all verification fields
    await sr.entities.User.update(userId, {
      kyc_status: 'unverified',
      account_state: 'BASIC_ACTIVE',
      account_state_updated_at: new Date().toISOString(),
      docupass_decision: null,
      docupass_session_reference: null,
      docupass_attempt_count: 0,
      docupass_verified_at: null,
      docupass_report_url: null,
      docupass_report_fetched: false,
      kyc_just_approved: false,
      id_extracted_name: null,
      id_extracted_dob: null,
      id_extracted_data: null,
      id_sex: null,
      id_expiry_date: null,
      id_issued_date: null,
      id_address: null,
      id_nationality: null,
      id_country: null,
      id_face_identical: null,
      id_face_confidence: null,
      id_authentication_score: null,
      id_match_rate: null,
      kyc_mismatch_reason: null,
      verification_complete: false,
      kyc_attempts: 0,
    });

    // 5. Patch Wallet — tier=1, needs_review=false, PRESERVE SasaPay fields
    const wallets = await sr.entities.Wallet.filter({ user_id: userId });
    if (wallets.length > 0) {
      const wallet = wallets[0];
      await sr.entities.Wallet.update(wallet.id, {
        tier: 1,
        needs_review: false,
        status: 'active',
        // Explicitly NOT touching: sasapay_account_number, sasapay_customer_id,
        // sasapay_account_status, sasapay_request_id, sasapay_kyc_uploaded_at,
        // account_number, pin_hash, pin_attempts, pin_locked_until
      });
    }

    // 6. Cancel active provisional permits
    const permits = await sr.entities.Permit.filter({
      rider_id: userId,
      status: 'active',
      permit_type: 'provisional',
    });
    if (permits.length > 0) {
      await sr.entities.Permit.updateMany(
        { rider_id: userId, status: 'active', permit_type: 'provisional' },
        { $set: { status: 'cancelled' } }
      );
    }

    // 7. AuditLog
    await sr.entities.AuditLog.create({
      user_id: userId,
      action: 'kyc_reset_for_testing',
      entity_type: 'User',
      entity_id: userId,
      old_values: {
        kyc_status: users[0].kyc_status,
        account_state: users[0].account_state,
        docupass_decision: users[0].docupass_decision,
      },
      new_values: {
        kyc_status: 'unverified',
        account_state: 'BASIC_ACTIVE',
        cleared_docs: clearedDocs,
        cancelled_permits: permits.length,
      },
      description: `KYC reset for testing by admin ${user.email}. Cleared ${clearedDocs} doc(s), cancelled ${permits.length} provisional permit(s). SasaPay wallet preserved.`,
      ip_address: 'admin:' + user.id,
    });

    return Response.json({
      success: true,
      cleared_docs: clearedDocs,
      cancelled_permits: permits.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
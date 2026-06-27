import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Phase 6 Verification Completion — checks all 3 sub-tasks
 * and sets verification_complete = true via service role.
 *
 * Sub-tasks (3 tasks):
 * 1. Identity Verification (id_front + id_back + selfie approved with provider_reference)
 * 2. Bike Photos (bike_left + bike_rear uploaded)
 * 3. Owner Verification (vehicle.is_owner_rider OR vehicle.owner_verified)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const sr = base44.asServiceRole;

    // Fetch full user (me() may not return custom fields)
    const users = await sr.entities.User.filter({ id: user.id });
    if (users.length === 0) return Response.json({ error: 'User not found' }, { status: 404 });
    const fullUser = users[0];

    // Fetch KYC documents
    const kycDocs = await sr.entities.KycDocument.filter({ user_id: user.id });

    // Fetch vehicle (M3 fix: remove invalid sort/limit params from filter)
    const vehicles = await sr.entities.Vehicle.filter({ rider_id: user.id });
    const vehicle = vehicles.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;

    // Sub-task 1: Identity Verification
    // H3 fix: ONLY allow verification if docupass_decision === 'accept' or all 3 docs are approved with provider_reference
    // Removed identityDocsUploaded bypass to prevent rejected users from passing
    const identityApproved = fullUser.docupass_decision === 'accept' ||
      ['id_front', 'id_back', 'selfie'].every(type =>
        kycDocs.some(d => d.document_type === type && d.status === 'approved' && d.provider_reference)
      );
    const identityDone = identityApproved;

    // Sub-task 2: Bike Photos — both angles must be admin-approved
    const bikeDone = kycDocs.some(d => d.document_type === 'bike_left' && d.status === 'approved') &&
                     kycDocs.some(d => d.document_type === 'bike_rear' && d.status === 'approved');

    // Sub-task 3: Owner Verification
    const ownerDone = vehicle ? (vehicle.is_owner_rider === true || vehicle.owner_verified === true) : false;

    const allDone = identityDone && bikeDone && ownerDone;

    if (!allDone) {
      return Response.json({
        success: false,
        verification_complete: false,
        tasks: { identity: identityDone, bike: bikeDone, owner: ownerDone },
      });
    }

    // Set verification_complete + kyc_status
    const updateData = { verification_complete: true };
    if (identityApproved && (!fullUser.kyc_status || fullUser.kyc_status === 'unverified')) {
      updateData.kyc_status = 'verified';
    }
    await sr.entities.User.update(user.id, updateData);

    // FIX 4: Call transitionAccountState with KYC_ACCEPTED (idempotent if already VERIFIED)
    try {
      await base44.functions.invoke('transitionAccountState', {
        userId: user.id,
        event: 'KYC_ACCEPTED',
        metadata: { source: 'completeVerification' },
      });
    } catch (stateError) {
      console.error('[completeVerification] State transition failed:', stateError);
      // Continue anyway - state might already be VERIFIED
    }

    // FIX 4: Convert provisional permit to full
    try {
      await base44.functions.invoke('convertProvisionalPermit', { userId: user.id });
    } catch (permitError) {
      console.error('[completeVerification] Permit conversion failed:', permitError);
      // Continue anyway - convertProvisionalPermit is idempotent
    }

    // Note: SasaPay personal onboarding is handled during WalletActivate (2-step progressive onboarding).
    // Verification completion only marks the user as verified — wallet activation happens separately.
    return Response.json({
      success: true,
      verification_complete: true,
      tasks: { identity: identityDone, bike: bikeDone, owner: ownerDone },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Phase 6 Verification Completion — checks all 4 sub-tasks
 * and sets verification_complete = true via service role.
 *
 * Sub-tasks (consolidated from 5 → 4):
 * 1. Identity Verification (id_front + id_back + selfie uploaded)
 * 2. Bike Photos (bike_front + bike_left + bike_rear + bike_right uploaded)
 * 3. Phone OTP (user.phone_verified === true)
 * 4. Owner Verification (vehicle.is_owner_rider OR vehicle.owner_verified)
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

    // Fetch vehicle
    const vehicles = await sr.entities.Vehicle.filter({ rider_id: user.id }, '-created_date', 1);
    const vehicle = vehicles[0] || null;

    // Sub-task 1: Identity Verification
    // IDAnalyzer-approved: all 3 identity docs approved with provider_reference
    // Or: user.docupass_decision === 'accept' (set by webhook)
    const hasIdFront = kycDocs.some(d => d.document_type === 'id_front' && d.file_url);
    const hasIdBack = kycDocs.some(d => d.document_type === 'id_back' && d.file_url);
    const hasSelfie = kycDocs.some(d => d.document_type === 'selfie' && d.file_url);
    const identityDocsUploaded = hasIdFront && hasIdBack && hasSelfie;
    const identityApproved = fullUser.docupass_decision === 'accept' ||
      ['id_front', 'id_back', 'selfie'].every(type =>
        kycDocs.some(d => d.document_type === type && d.status === 'approved' && d.provider_reference)
      );
    const identityDone = identityApproved || identityDocsUploaded;

    // Sub-task 2: Bike Photos
    const hasBikeFront = kycDocs.some(d => d.document_type === 'bike_front' && d.file_url);
    const hasBikeLeft = kycDocs.some(d => d.document_type === 'bike_left' && d.file_url);
    const hasBikeRear = kycDocs.some(d => d.document_type === 'bike_rear' && d.file_url);
    const hasBikeRight = kycDocs.some(d => d.document_type === 'bike_right' && d.file_url);
    const bikeDone = hasBikeFront && hasBikeLeft && hasBikeRear && hasBikeRight;

    // Sub-task 3: Phone OTP
    const phoneDone = fullUser.phone_verified === true;

    // Sub-task 4: Owner Verification
    const ownerDone = vehicle ? (vehicle.is_owner_rider === true || vehicle.owner_verified === true) : false;

    const allDone = identityDone && bikeDone && phoneDone && ownerDone;

    if (!allDone) {
      return Response.json({
        success: false,
        verification_complete: false,
        tasks: { identity: identityDone, bike: bikeDone, phone: phoneDone, owner: ownerDone },
      });
    }

    // Set verification_complete + kyc_status
    const updateData = { verification_complete: true };
    if (identityApproved && (!fullUser.kyc_status || fullUser.kyc_status === 'unverified')) {
      updateData.kyc_status = 'verified';
    }
    await sr.entities.User.update(user.id, updateData);

    // Note: SasaPay personal onboarding is handled during WalletActivate (2-step progressive onboarding).
    // Verification completion only marks the user as verified — wallet activation happens separately.
    return Response.json({
      success: true,
      verification_complete: true,
      tasks: { identity: identityDone, bike: bikeDone, phone: phoneDone, owner: ownerDone },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
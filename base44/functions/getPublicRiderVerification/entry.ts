import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Public Rider Verification — returns ONLY compliance-relevant data.
 * No PII (name, national_id, phone, email, otp_hash) is exposed.
 *
 * Called by the public /verify/:riderId page for unauthenticated viewers
 * (officers, customers, county staff) to verify a rider's compliance status.
 *
 * Payload: { riderId }
 * Returns: { verification_complete, bike_approved, permit, policy, county, stage, group }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { riderId } = await req.json();

    if (!riderId) {
      return Response.json({ error: 'Missing riderId' }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // Fetch rider — only verification_complete flag, no PII fields
    let rider = null;
    try {
      rider = await sr.entities.User.get(riderId);
    } catch {
      return Response.json({ error: 'Rider not found' }, { status: 404 });
    }
    if (!rider) {
      return Response.json({ error: 'Rider not found' }, { status: 404 });
    }

    // Fetch vehicle, permit, policy, group membership in parallel
    const [vehicles, permits, policies, groupMembers] = await Promise.all([
      sr.entities.Vehicle.filter({ rider_id: riderId }, '-created_date'),
      sr.entities.Permit.filter({ rider_id: riderId, status: 'active' }, '-end_date'),
      sr.entities.Policy.filter({ rider_id: riderId, status: 'active' }, '-end_date'),
      sr.entities.GroupMember.filter({ user_id: riderId, status: 'approved' }),
    ]);

    const vehicle = vehicles[0] || null;
    const permit = permits[0] || null;
    const policy = policies[0] || null;
    const groupMember = groupMembers[0] || null;

    // Fetch county + stage names
    let county = null;
    let stage = null;
    let group = null;

    if (vehicle) {
      const [countyData, stageData] = await Promise.all([
        vehicle.county_id ? sr.entities.County.get(vehicle.county_id).catch(() => null) : null,
        vehicle.stage_id ? sr.entities.Stage.get(vehicle.stage_id).catch(() => null) : null,
      ]);
      county = countyData ? { name: countyData.name } : null;
      stage = stageData ? { name: stageData.name } : null;
    }

    if (groupMember) {
      const groupData = await sr.entities.Group.get(groupMember.group_id).catch(() => null);
      group = groupData ? { name: groupData.name, type: groupData.type } : null;
    }

    // Return ONLY compliance-relevant fields — no PII
    return Response.json({
      verification_complete: rider.verification_complete === true,
      bike: vehicle ? {
        plate_number: vehicle.plate_number,
        status: vehicle.status,
        make: vehicle.make,
        color: vehicle.color,
      } : null,
      permit: permit ? {
        status: permit.status,
        end_date: permit.end_date,
        billing_cycle: permit.billing_cycle,
      } : null,
      policy: policy ? {
        status: policy.status,
        end_date: policy.end_date,
      } : null,
      county,
      stage,
      group,
    });
  } catch (error) {
    console.error('getPublicRiderVerification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
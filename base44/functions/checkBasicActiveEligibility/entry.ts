import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Check if a user is eligible for BASIC_ACTIVE state.
 * Returns eligible: boolean and missingConditions array.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const sr = base44.asServiceRole;
    const userId = user.id;

    // Fetch all required data
    const [users, vehicles, wallets, groupMembers] = await Promise.all([
      sr.entities.User.filter({ id: userId }),
      sr.entities.Vehicle.filter({ rider_id: userId }),
      sr.entities.Wallet.filter({ user_id: userId, entity_type: 'personal' }),
      sr.entities.GroupMember.filter({ user_id: userId }),
    ]);

    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const currentUser = users[0];

    const conditions = [];
    const missingConditions = [];

    // Condition 1: Profile complete
    const profileComplete = !!(
      currentUser.full_name &&
      currentUser.phone &&
      currentUser.national_id &&
      currentUser.county_id
    );
    conditions.push({ name: 'profile_complete', met: profileComplete });
    if (!profileComplete) missingConditions.push('profile_complete');

    // Condition 2: Wallet active (Tier 1+)
    const walletActive = wallets.length > 0 && 
      (wallets[0].status === 'active' || wallets[0].tier >= 1);
    conditions.push({ name: 'wallet_active', met: walletActive });
    if (!walletActive) missingConditions.push('wallet_active');

    // Condition 3: Vehicle with ward_id exists
    const sortedVehicles = vehicles.sort((a, b) => 
      new Date(b.created_date) - new Date(a.created_date)
    );
    const latestVehicle = sortedVehicles[0];
    const vehicleWithWard = latestVehicle && latestVehicle.ward_id;
    conditions.push({ name: 'vehicle_with_ward', met: !!vehicleWithWard });
    if (!vehicleWithWard) missingConditions.push('vehicle_with_ward');

    // Condition 4: Group membership exists (any status)
    const hasGroupMembership = groupMembers.length > 0;
    conditions.push({ name: 'group_membership', met: hasGroupMembership });
    if (!hasGroupMembership) missingConditions.push('group_membership');

    const eligible = missingConditions.length === 0;

    return Response.json({
      eligible,
      missingConditions,
      conditions,
      current_account_state: currentUser.account_state || 'DRAFT',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
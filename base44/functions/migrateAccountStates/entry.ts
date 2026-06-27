import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * One-time migration to backfill account_state field for all existing users.
 * Callable only by super_admin.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'super_admin' && user.role !== 'bodasure_staff')) {
      return Response.json({ error: 'Forbidden - admin only' }, { status: 403 });
    }

    const sr = base44.asServiceRole;

    // Fetch all users
    const allUsers = await sr.entities.User.filter({});
    
    let migratedCount = 0;
    let errors = 0;
    const stateDistribution = {};

    for (const u of allUsers) {
      try {
        // Skip if already has account_state
        if (u.account_state) {
          continue;
        }

        // Compute account_state from existing fields
        let newState = 'DRAFT';
        const hasProfile = u.full_name && u.phone && u.national_id && u.county_id;
        
        // Check wallet status
        const wallets = await sr.entities.Wallet.filter({ user_id: u.id, entity_type: 'personal' });
        const walletActive = wallets.length > 0 && (wallets[0].status === 'active' || wallets[0].tier >= 1);

        // Check vehicle
        const vehicles = await sr.entities.Vehicle.filter({ rider_id: u.id });
        const hasVehicleWithWard = vehicles.length > 0 && vehicles[0].ward_id;

        // Check SACCO membership
        const groupMembers = await sr.entities.GroupMember.filter({ user_id: u.id });
        const hasGroupMember = groupMembers.length > 0;

        // Determine state
        if (!hasProfile || !walletActive) {
          newState = 'DRAFT';
        } else if (u.verification_complete || u.kyc_status === 'verified') {
          newState = 'VERIFIED';
        } else if (hasProfile && walletActive && hasVehicleWithWard && hasGroupMember) {
          newState = 'BASIC_ACTIVE';
        } else if (u.docupass_decision === 'reject') {
          newState = 'KYC_REJECTED';
        } else if (u.docupass_decision === 'review') {
          newState = 'KYC_REVIEW';
        } else if (u.kyc_status === 'pending' || u.docupass_decision === 'pending') {
          newState = 'KYC_PENDING';
        } else {
          newState = 'DRAFT';
        }

        // Update user
        await sr.entities.User.update(u.id, {
          account_state: newState,
          account_state_updated_at: new Date().toISOString(),
          onboarding_complete: newState === 'BASIC_ACTIVE' || newState === 'VERIFIED' ? true : u.onboarding_complete,
        });

        // Audit log
        await sr.entities.AuditLog.create({
          user_id: u.id,
          action: 'account_state_migrated',
          entity_type: 'User',
          entity_id: u.id,
          new_values: { account_state: newState },
          description: `Account state migrated to ${newState} during backfill`,
          ip_address: 'system',
        });

        migratedCount++;
        stateDistribution[newState] = (stateDistribution[newState] || 0) + 1;
      } catch (userError) {
        console.error(`Migration failed for user ${u.id}:`, userError);
        errors++;
      }
    }

    return Response.json({
      success: true,
      migrated: migratedCount,
      errors,
      state_distribution: stateDistribution,
      executed_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
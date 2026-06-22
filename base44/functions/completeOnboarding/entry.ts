import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Verify profile is complete
    if (!user.full_name || !user.phone || !user.national_id || !user.county_id) {
      return Response.json({ error: 'Profile is not complete. Please finish Phase 1.' }, { status: 400 });
    }

    // 2. Verify vehicle exists with stage mapping
    const vehicles = await base44.entities.Vehicle.filter({ rider_id: user.id }, '-created_date');
    if (!vehicles || vehicles.length === 0) {
      return Response.json({ error: 'No bike registered. Please finish Phase 2.' }, { status: 400 });
    }
    const vehicle = vehicles[0];
    if (!vehicle.sub_county_id || !vehicle.ward_id || !vehicle.stage_id) {
      return Response.json({ error: 'Bike is not mapped to a stage. Please finish Phase 3.' }, { status: 400 });
    }

    // 3. Verify user has a stage_id set
    if (!user.stage_id) {
      return Response.json({ error: 'Stage not confirmed. Please finish Phase 4.' }, { status: 400 });
    }

    // 4. Verify exactly one group membership (1-rider-1-group policy)
    const memberships = await base44.entities.GroupMember.filter({ user_id: user.id });
    if (!memberships || memberships.length === 0) {
      return Response.json({ error: 'No SACCO/group selected. Please finish Phase 5.' }, { status: 400 });
    }
    if (memberships.length > 1) {
      // Enforce 1-rider-1-group: keep only the most recent, delete extras
      const sorted = [...memberships].sort((a, b) =>
        new Date(b.joined_date || b.created_date) - new Date(a.joined_date || a.created_date)
      );
      const keepId = sorted[0].id;
      for (const m of sorted.slice(1)) {
        await base44.entities.GroupMember.delete(m.id);
      }
    }

    // 5. All checks passed — mark onboarding complete via service role
    const sr = base44.asServiceRole;
    await sr.entities.User.update(user.id, {
      onboarding_complete: true,
      profile_complete: true,
    });

    return Response.json({
      success: true,
      message: 'Onboarding completed successfully',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
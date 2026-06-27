import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * ⚠️ DEPRECATED — This function is no longer called.
 * Provisional permits are now issued via LipaCounty payment flow with permit_type='provisional' stamp.
 * Kept for audit purposes only. Do not use in new code.
 * 
 * Issue provisional permit upon BASIC_ACTIVE achievement.
 * Called after payment success.
 */
Deno.serve(async (req) => {
  try {
    // FIX 2: Parse request body FIRST before any async DB calls
    const requestBody = await req.json();
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const sr = base44.asServiceRole;

    // 1. Validate BASIC_ACTIVE conditions
    const eligibility = await base44.functions.invoke('checkBasicActiveEligibility', { userId: user.id });
    if (!eligibility.eligible) {
      return Response.json({ 
        error: 'Not eligible for provisional permit', 
        missingConditions: eligibility.missingConditions 
      }, { status: 400 });
    }

    // 2. Get user's vehicle and county
    const vehicles = await sr.entities.Vehicle.filter({ rider_id: user.id });
    if (!vehicles || vehicles.length === 0) {
      return Response.json({ error: 'No vehicle registered' }, { status: 400 });
    }
    const vehicle = vehicles.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    const countyId = vehicle.county_id || user.county_id;

    // 3. Get billing cycle from request (rider chooses at payment time)
    const { billing_cycle } = requestBody;
    if (!billing_cycle || !['weekly', 'monthly', 'quarterly', 'yearly'].includes(billing_cycle)) {
      return Response.json({ error: 'Invalid billing_cycle' }, { status: 400 });
    }

    // 4. Look up FeeSchedule for this county and billing cycle
    const feeSchedules = await sr.entities.FeeSchedule.filter({ 
      county_id: countyId, 
      permit_type: billing_cycle,
      is_active: true 
    });
    if (!feeSchedules || feeSchedules.length === 0) {
      return Response.json({ error: 'No fee schedule found for this county and billing cycle' }, { status: 404 });
    }
    const feeSchedule = feeSchedules[0];

    // 5. Calculate permit end date: MIN(billing_cycle_end, issued_at + 14 days)
    const issuedAt = new Date();
    const billingCycleEnd = new Date(issuedAt);
    if (billing_cycle === 'weekly') billingCycleEnd.setDate(billingCycleEnd.getDate() + 7);
    else if (billing_cycle === 'monthly') billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1);
    else if (billing_cycle === 'quarterly') billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 3);
    else if (billing_cycle === 'yearly') billingCycleEnd.setFullYear(billingCycleEnd.getFullYear() + 1);

    const provisionalEnd = new Date(issuedAt);
    provisionalEnd.setDate(provisionalEnd.getDate() + 14);
    const endDate = billingCycleEnd < provisionalEnd ? billingCycleEnd : provisionalEnd;

    // 6. Create provisional permit
    const permit = await sr.entities.Permit.create({
      vehicle_id: vehicle.id,
      rider_id: user.id,
      county_id: countyId,
      billing_cycle,
      start_date: issuedAt.toISOString(),
      end_date: endDate.toISOString(),
      status: 'active',
      amount_paid_cents: feeSchedule.amount_cents,
      fee_schedule_id: feeSchedule.id,
      permit_type: 'provisional',
      issued_manually: false,
    });

    // 7. Transition account state to BASIC_ACTIVE
    const transitionResult = await base44.functions.invoke('transitionAccountState', {
      userId: user.id,
      event: 'BASIC_ACTIVE_ACHIEVED',
      metadata: { 
        permit_id: permit.id, 
        billing_cycle,
        provisional_end_date: provisionalEnd.toISOString(),
      },
    });

    // 8. Send SMS notification
    try {
      await base44.functions.invoke('sendSms', {
        to: user.phone,
        message: `Your BodaSure provisional permit is active. Complete verification within 14 days to keep it valid. Open the app to start.`,
      });
    } catch (smsError) {
      console.error('Provisional permit SMS failed:', smsError);
    }

    // 9. Audit log
    await sr.entities.AuditLog.create({
      user_id: user.id,
      action: 'provisional_permit_issued',
      entity_type: 'Permit',
      entity_id: permit.id,
      new_values: { permit_type: 'provisional', end_date: endDate.toISOString() },
      description: `Provisional permit issued for ${vehicle.plate_number}, valid until ${endDate.toISOString()}`,
      ip_address: 'system',
    });

    return Response.json({
      success: true,
      permit_id: permit.id,
      permit_type: 'provisional',
      end_date: endDate.toISOString(),
      account_state: transitionResult.new_state,
      message: 'Provisional permit issued successfully',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
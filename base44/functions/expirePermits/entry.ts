import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Permit Expiry — Scheduled backend function.
 *
 * Finds all active permits where end_date < now and marks them as expired.
 * Also flags the related vehicle's compliance status if no other active permit exists.
 *
 * Runs daily via scheduled automation, or can be triggered manually by an admin.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let isScheduled = false;
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      isScheduled = true;
    }

    const userRoles = new Set(user?.roles || []);
    if (user?.role) userRoles.add(user.role);
    if (!isScheduled && user && !userRoles.has('super_admin')) {
      return Response.json({ error: 'Forbidden — super admin only' }, { status: 403 });
    }

    const b44 = base44.asServiceRole;
    const now = new Date().toISOString();

    // Fetch all active permits (paginated)
    const allPermits = [];
    let skip = 0;
    const limit = 50;
    while (true) {
      const batch = await b44.entities.Permit.filter({ status: 'active' }, '-created_date', limit, skip);
      if (batch.length === 0) break;
      allPermits.push(...batch);
      if (batch.length < limit) break;
      skip += limit;
    }

    if (allPermits.length === 0) {
      return Response.json({ expired: 0, message: 'No active permits to check' });
    }

    // Find permits past their end_date
    const expiredPermits = allPermits.filter(p => p.end_date && p.end_date < now);

    if (expiredPermits.length === 0) {
      return Response.json({ expired: 0, message: 'All active permits are within validity' });
    }

    // Expire each permit and handle provisional permit consequences
    let expiredCount = 0;
    let suspendedCount = 0;
    const riderIdsToNotify = new Set();

    for (const permit of expiredPermits) {
      try {
        await b44.entities.Permit.update(permit.id, {
          status: 'expired',
        });
        expiredCount++;

        // If provisional permit expired, check if rider needs suspension
        if (permit.permit_type === 'provisional' && permit.rider_id) {
          riderIdsToNotify.add(permit.rider_id);
        }
      } catch (e) {
        console.error(`Failed to expire permit ${permit.id}: ${e.message}`);
      }
    }

    // Suspend riders whose provisional permit expired without verification
    for (const riderId of riderIdsToNotify) {
      try {
        const user = await b44.entities.User.get(riderId);
        if (user && user.account_state === 'BASIC_ACTIVE' && !user.verification_complete) {
          // Transition to SUSPENDED
          await b44.functions.invoke('transitionAccountState', {
            userId: riderId,
            event: 'PROVISIONAL_EXPIRED',
            metadata: { reason: 'provisional_permit_expired_without_verification' },
          });
          suspendedCount++;

          // Send SMS notification
          try {
            await b44.functions.invoke('sendSms', {
              to: user.phone,
              message: 'Your BodaSure provisional permit has expired. Please complete identity verification to reinstate your account.',
            });
          } catch (smsError) {
            console.error(`SMS failed for rider ${riderId}:`, smsError);
          }
        }
      } catch (e) {
        console.error(`Failed to suspend rider ${riderId}:`, e.message);
      }
    }

    // Log audit entry
    try {
      await b44.entities.AuditLog.create({
        action: 'permit_expiry_run',
        description: `Automated permit expiry: ${expiredCount} permits expired`,
        new_values: { expired_count: expiredCount, run_at: now },
      });
    } catch {}

    return Response.json({
      expired: expiredCount,
      suspended: suspendedCount,
      checked: allPermits.length,
      message: `Expired ${expiredCount} permits and suspended ${suspendedCount} riders`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
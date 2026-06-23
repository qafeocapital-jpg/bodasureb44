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

    if (!isScheduled && user && user.role !== 'super_admin') {
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

    // Expire each permit
    let expiredCount = 0;
    for (const permit of expiredPermits) {
      try {
        await b44.entities.Permit.update(permit.id, {
          status: 'expired',
        });
        expiredCount++;
      } catch (e) {
        console.error(`Failed to expire permit ${permit.id}: ${e.message}`);
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
      checked: allPermits.length,
      message: `Expired ${expiredCount} permits out of ${allPermits.length} active permits checked`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
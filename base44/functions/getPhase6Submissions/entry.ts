import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Returns Phase 6 verification submission data for admin review.
 * Fetches all KYC docs, users, and vehicles server-side to avoid
 * N+1 client-side API calls (critical for scalability with 1M+ users).
 *
 * Admin-only: requires super_admin or admin role.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sr = base44.asServiceRole;

    // Fetch recent KYC docs (limited to 200 for performance)
    const allDocs = await sr.entities.KycDocument.filter({}, '-created_date', 200);

    // Get unique user IDs
    const userIds = [...new Set(allDocs.map(d => d.user_id))];

    // Fetch users and vehicles in parallel (server-side — no client round-trips)
    const [users, vehicles] = await Promise.all([
      Promise.all(
        userIds.map(uid =>
          sr.entities.User.filter({ id: uid }).then(u => u[0] || null).catch(() => null)
        )
      ),
      Promise.all(
        userIds.map(uid =>
          sr.entities.Vehicle.filter({ rider_id: uid }, '-created_date', 1).catch(() => [])
        )
      ),
    ]);

    const riders = userIds
      .map((uid, i) => {
        const userDoc = users[i];
        if (!userDoc) return null;
        const vehicle = vehicles[i]?.[0] || null;
        const userDocs = allDocs.filter(d => d.user_id === uid);
        return { user: userDoc, vehicle, kycDocs: userDocs };
      })
      .filter(r => r !== null);

    return Response.json({ riders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
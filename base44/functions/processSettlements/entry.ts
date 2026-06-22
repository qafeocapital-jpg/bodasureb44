import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Settlement Processing — Scheduled backend function.
 *
 * Aggregates unprocessed TransactionLeg records into Settlement records
 * grouped by entity_type (county, sacco, platform, merchant) and entity_id.
 *
 * For each group:
 * 1. Sums all pending leg amounts
 * 2. Creates a Settlement record with status 'pending'
 * 3. Marks the legs as processed (by linking them via transaction_ids)
 *
 * Admin-only: verifies user.role === 'admin' when invoked manually,
 * but runs as service-role when triggered by the scheduler.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Determine if this is a manual invocation (has user auth) or scheduled
    let isScheduled = false;
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      isScheduled = true;
    }

    if (!isScheduled && user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const b44 = base44.asServiceRole;

    // Fetch all TransactionLegs that haven't been settled yet.
    // We track settled legs by checking if a Settlement with their transaction_id exists.
    const allLegs = [];
    let skip = 0;
    const limit = 50;
    while (true) {
      const batch = await b44.entities.TransactionLeg.filter({}, '-created_date', limit, skip);
      if (batch.length === 0) break;
      allLegs.push(...batch);
      if (batch.length < limit) break;
      skip += limit;
    }

    if (allLegs.length === 0) {
      return Response.json({ processed: 0, settlements_created: 0, message: 'No transaction legs to process' });
    }

    // Fetch all existing settlements to know which transaction_ids are already settled
    const allSettlements = [];
    skip = 0;
    while (true) {
      const batch = await b44.entities.Settlement.filter({}, '-created_date', limit, skip);
      if (batch.length === 0) break;
      allSettlements.push(...batch);
      if (batch.length < limit) break;
      skip += limit;
    }

    const settledTxnIds = new Set();
    allSettlements.forEach(s => {
      if (Array.isArray(s.transaction_ids)) {
        s.transaction_ids.forEach(id => settledTxnIds.add(id));
      }
    });

    // Filter to unprocessed legs only
    const unprocessedLegs = allLegs.filter(leg => !settledTxnIds.has(leg.transaction_id));

    if (unprocessedLegs.length === 0) {
      return Response.json({ processed: 0, settlements_created: 0, message: 'All transaction legs already settled' });
    }

    // Group by leg_type (entity_type) + recipient_wallet_id (entity_id proxy)
    const groups = {};
    for (const leg of unprocessedLegs) {
      const key = `${leg.leg_type}__${leg.recipient_wallet_id || 'unknown'}`;
      if (!groups[key]) {
        groups[key] = {
          entity_type: leg.leg_type,
          entity_id: leg.recipient_wallet_id || '',
          amount_cents: 0,
          transaction_ids: [],
          period_start: leg.created_date,
          period_end: leg.created_date,
        };
      }
      groups[key].amount_cents += leg.amount_cents || 0;
      groups[key].transaction_ids.push(leg.transaction_id);
      if (leg.created_date < groups[key].period_start) {
        groups[key].period_start = leg.created_date;
      }
      if (leg.created_date > groups[key].period_end) {
        groups[key].period_end = leg.created_date;
      }
    }

    // Create Settlement records for each group
    const settlementsToCreate = Object.values(groups).map(g => ({
      entity_type: g.entity_type,
      entity_id: g.entity_id,
      amount_cents: g.amount_cents,
      status: 'pending',
      transaction_ids: g.transaction_ids,
      period_start: g.period_start,
      period_end: g.period_end,
    }));

    let createdCount = 0;
    for (const s of settlementsToCreate) {
      try {
        await b44.entities.Settlement.create(s);
        createdCount++;
      } catch (e) {
        console.error(`Failed to create settlement for ${s.entity_type} ${s.entity_id}: ${e.message}`);
      }
    }

    // Log audit entry
    try {
      await b44.entities.AuditLog.create({
        action: 'settlement_processing_run',
        description: `Automated settlement processing: ${createdCount} settlements created from ${unprocessedLegs.length} transaction legs`,
        new_values: { settlements_created: createdCount, legs_processed: unprocessedLegs.length },
      });
    } catch {}

    return Response.json({
      processed: unprocessedLegs.length,
      settlements_created: createdCount,
      message: `Created ${createdCount} settlement records from ${unprocessedLegs.length} transaction legs`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
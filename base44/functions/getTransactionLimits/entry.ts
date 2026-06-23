import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Get daily transaction limits for a wallet + transaction type.
 * Sums today's completed transactions and compares against SasaPay daily limits.
 *
 * Payload:
 * - wallet_id: Rider's wallet ID
 * - transaction_type: BodaSure type ('lipisha', 'withdraw', 'send', 'deposit')
 *
 * Returns:
 * - daily_used_kes: Total completed today (KES)
 * - daily_limit_kes: SasaPay daily limit for this type (KES)
 * - per_tx_limit_kes: Per-transaction limit (KES)
 * - remaining_kes: Remaining daily capacity (KES)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { wallet_id, transaction_type } = await req.json();

    if (!wallet_id || !transaction_type) {
      return Response.json({ error: 'Missing wallet_id or transaction_type' }, { status: 400 });
    }

    // SasaPay published daily limits per transaction type (KES)
    const LIMITS = {
      lipisha: { daily: 300000, per_tx: 150000 },
      deposit: { daily: 300000, per_tx: 150000 },
      send: { daily: 300000, per_tx: 150000 },
      withdraw: { daily: 150000, per_tx: 70000 },
    };

    const limit = LIMITS[transaction_type] || { daily: 150000, per_tx: 70000 };

    // Sum today's completed transactions for this wallet + type
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const txns = await base44.asServiceRole.entities.Transaction.filter({
      wallet_id,
      type: transaction_type,
      status: 'completed',
    });

    // Filter to today only (created_date >= todayStart)
    const todayTxns = txns.filter(t => t.created_date && new Date(t.created_date) >= todayStart);
    const dailyUsedCents = todayTxns.reduce((sum, t) => sum + (t.amount_cents || 0), 0);
    const dailyUsedKes = dailyUsedCents / 100;
    const remainingKes = Math.max(0, limit.daily - dailyUsedKes);

    return Response.json({
      daily_used_kes: dailyUsedKes,
      daily_limit_kes: limit.daily,
      per_tx_limit_kes: limit.per_tx,
      remaining_kes: remainingKes,
    });
  } catch (error) {
    console.error('getTransactionLimits error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
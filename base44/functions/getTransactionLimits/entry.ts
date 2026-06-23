import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Get daily transaction limits for a wallet + transaction type.
 * Tier 1 wallets: KES 5,000 cumulative daily cap across lipisha + deposit.
 * Tier 2 wallets: Standard SasaPay published limits.
 *
 * Payload: { wallet_id, transaction_type }
 * Returns: { daily_used_kes, daily_limit_kes, per_tx_limit_kes, remaining_kes, tier1_capped }
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

    const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
    if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });

    // Verify wallet belongs to the authenticated user
    if (wallet.user_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tier = wallet.tier || 0;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Tier 1: KES 5,000 cumulative daily cap across lipisha + deposit
    const TIER1_DAILY_LIMIT = 5000;

    // Tier 2: SasaPay published daily limits (KES)
    const TIER2_LIMITS = {
      lipisha: { daily: 300000, per_tx: 150000 },
      deposit: { daily: 300000, per_tx: 150000 },
      send: { daily: 300000, per_tx: 150000 },
      withdraw: { daily: 150000, per_tx: 70000 },
    };

    if (tier <= 1) {
      // Query both lipisha + deposit for cumulative usage
      const [lipishaTxns, depositTxns] = await Promise.all([
        base44.asServiceRole.entities.Transaction.filter({
          wallet_id, type: 'lipisha', status: 'completed',
        }),
        base44.asServiceRole.entities.Transaction.filter({
          wallet_id, type: 'deposit', status: 'completed',
        }),
      ]);

      const todayLipisha = lipishaTxns
        .filter(t => t.created_date && new Date(t.created_date) >= todayStart)
        .reduce((sum, t) => sum + (t.amount_cents || 0), 0);
      const todayDeposit = depositTxns
        .filter(t => t.created_date && new Date(t.created_date) >= todayStart)
        .reduce((sum, t) => sum + (t.amount_cents || 0), 0);

      const combinedUsedKes = (todayLipisha + todayDeposit) / 100;
      const remainingKes = Math.max(0, TIER1_DAILY_LIMIT - combinedUsedKes);

      return Response.json({
        daily_used_kes: combinedUsedKes,
        daily_limit_kes: TIER1_DAILY_LIMIT,
        per_tx_limit_kes: TIER1_DAILY_LIMIT,
        remaining_kes: remainingKes,
        tier1_capped: true,
      });
    }

    // Tier 2: standard SasaPay limits
    const limit = TIER2_LIMITS[transaction_type] || { daily: 150000, per_tx: 70000 };

    const txns = await base44.asServiceRole.entities.Transaction.filter({
      wallet_id,
      type: transaction_type,
      status: 'completed',
    });

    const todayTxns = txns.filter(t => t.created_date && new Date(t.created_date) >= todayStart);
    const dailyUsedCents = todayTxns.reduce((sum, t) => sum + (t.amount_cents || 0), 0);
    const dailyUsedKes = dailyUsedCents / 100;
    const remainingKes = Math.max(0, limit.daily - dailyUsedKes);

    return Response.json({
      daily_used_kes: dailyUsedKes,
      daily_limit_kes: limit.daily,
      per_tx_limit_kes: limit.per_tx,
      remaining_kes: remainingKes,
      tier1_capped: false,
    });
  } catch (error) {
    console.error('getTransactionLimits error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
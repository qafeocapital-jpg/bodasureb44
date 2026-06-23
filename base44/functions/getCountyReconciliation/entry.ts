import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * County-Level Reconciliation Summary for Super Admin.
 *
 * Aggregates earnings two ways:
 * 1. By Fee Type — from Transaction records (lipisha, lipa_county, etc.)
 *    Shows total volume, SasaPay fees, BodaSure markup, total fees.
 * 2. By County — from TransactionLeg records (internal ledger splits)
 *    Shows county share, SACCO share, and platform share per county.
 *
 * Also returns internal ledger totals (sum of all legs by type) and
 * transaction split totals (volume + fee breakdown).
 *
 * Payload:
 * - date_from: ISO date string (optional, default 30 days ago)
 * - date_to: ISO date string (optional, default today)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { date_from, date_to } = await req.json().catch(() => ({}));

    const toDate = date_to ? new Date(date_to + 'T23:59:59') : new Date();
    const fromDate = date_from ? new Date(date_from + 'T00:00:00') : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fetch completed transactions in date range
    const allTxns = await base44.asServiceRole.entities.Transaction.filter({
      status: 'completed',
    }, '-created_date', 500);
    const txns = allTxns.filter(t => {
      const created = new Date(t.created_date);
      return created >= fromDate && created <= toDate;
    });

    // Fetch all TransactionLegs for these transactions
    const txnIds = new Set(txns.map(t => t.id));
    const allLegs = await base44.asServiceRole.entities.TransactionLeg.filter({}, '-created_date', 500);
    const legs = allLegs.filter(l => txnIds.has(l.transaction_id));

    // Fetch business wallets to map recipient_wallet_id → county_id
    const countyWallets = await base44.asServiceRole.entities.Wallet.filter({ entity_type: 'business' });
    const walletToCounty = {};
    for (const w of countyWallets) {
      if (w.account_number && w.account_number.startsWith('COUNTY_')) {
        walletToCounty[w.id] = w.account_number.replace('COUNTY_', '');
      }
    }

    // Fetch counties for names
    const counties = await base44.asServiceRole.entities.County.list();
    const countyMap = {};
    for (const c of counties) {
      countyMap[c.id] = c.name;
    }

    // --- 1. Aggregate by fee type (from transactions) ---
    const byFeeType = {};
    let totalVolumeKes = 0;
    let totalSasapayFeeKes = 0;
    let totalBodasureFeeKes = 0;

    for (const t of txns) {
      const type = t.type || 'unknown';
      const amountKes = (t.amount_cents || 0) / 100;
      const sasapayFee = t.sasapay_fee_kes || 0;
      const bodasureFee = t.bodasure_fee_kes || 0;

      if (!byFeeType[type]) {
        byFeeType[type] = { count: 0, total_amount_kes: 0, sasapay_fee_kes: 0, bodasure_fee_kes: 0, total_fee_kes: 0 };
      }
      byFeeType[type].count++;
      byFeeType[type].total_amount_kes += amountKes;
      byFeeType[type].sasapay_fee_kes += sasapayFee;
      byFeeType[type].bodasure_fee_kes += bodasureFee;
      byFeeType[type].total_fee_kes += sasapayFee + bodasureFee;

      totalVolumeKes += amountKes;
      totalSasapayFeeKes += sasapayFee;
      totalBodasureFeeKes += bodasureFee;
    }

    // Round fee type values
    for (const type of Object.keys(byFeeType)) {
      byFeeType[type].total_amount_kes = Math.round(byFeeType[type].total_amount_kes * 100) / 100;
      byFeeType[type].sasapay_fee_kes = Math.round(byFeeType[type].sasapay_fee_kes * 100) / 100;
      byFeeType[type].bodasure_fee_kes = Math.round(byFeeType[type].bodasure_fee_kes * 100) / 100;
      byFeeType[type].total_fee_kes = Math.round(byFeeType[type].total_fee_kes * 100) / 100;
    }

    // --- 2. Build transaction_id → county_id map from county legs ---
    const txnToCounty = {};
    for (const leg of legs) {
      if (leg.leg_type === 'county') {
        const countyId = walletToCounty[leg.recipient_wallet_id];
        if (countyId) {
          txnToCounty[leg.transaction_id] = countyId;
        }
      }
    }

    // --- 3. Aggregate by county (from legs + transaction totals) ---
    const byCounty = {};

    // Seed county data from transactions
    for (const t of txns) {
      const countyId = txnToCounty[t.id] || 'unknown';
      if (!byCounty[countyId]) {
        byCounty[countyId] = {
          county_name: countyMap[countyId] || 'Unattributed',
          transaction_count: 0,
          total_amount_kes: 0,
          county_share_kes: 0,
          sacco_share_kes: 0,
          platform_share_kes: 0,
        };
      }
      byCounty[countyId].transaction_count++;
      byCounty[countyId].total_amount_kes += (t.amount_cents || 0) / 100;
    }

    // Add leg splits per county
    for (const leg of legs) {
      const countyId = txnToCounty[leg.transaction_id] || 'unknown';
      if (!byCounty[countyId]) {
        byCounty[countyId] = {
          county_name: countyMap[countyId] || 'Unattributed',
          transaction_count: 0,
          total_amount_kes: 0,
          county_share_kes: 0,
          sacco_share_kes: 0,
          platform_share_kes: 0,
        };
      }
      const amountKes = (leg.amount_cents || 0) / 100;
      if (leg.leg_type === 'county') byCounty[countyId].county_share_kes += amountKes;
      if (leg.leg_type === 'sacco') byCounty[countyId].sacco_share_kes += amountKes;
      if (leg.leg_type === 'platform') byCounty[countyId].platform_share_kes += amountKes;
    }

    // Round county values
    for (const c of Object.values(byCounty)) {
      c.total_amount_kes = Math.round(c.total_amount_kes * 100) / 100;
      c.county_share_kes = Math.round(c.county_share_kes * 100) / 100;
      c.sacco_share_kes = Math.round(c.sacco_share_kes * 100) / 100;
      c.platform_share_kes = Math.round(c.platform_share_kes * 100) / 100;
    }

    // --- 4. Internal ledger totals (sum of all legs by type) ---
    const ledgerTotals = { county: 0, sacco: 0, platform: 0, rider: 0, owner: 0, merchant: 0 };
    for (const leg of legs) {
      const amountKes = (leg.amount_cents || 0) / 100;
      if (ledgerTotals[leg.leg_type] !== undefined) {
        ledgerTotals[leg.leg_type] += amountKes;
      }
    }
    for (const k of Object.keys(ledgerTotals)) {
      ledgerTotals[k] = Math.round(ledgerTotals[k] * 100) / 100;
    }

    return Response.json({
      totals: {
        transaction_volume_kes: Math.round(totalVolumeKes * 100) / 100,
        bodasure_revenue_kes: Math.round(totalBodasureFeeKes * 100) / 100,
        sasapay_fee_total_kes: Math.round(totalSasapayFeeKes * 100) / 100,
        net_revenue_kes: Math.round((totalBodasureFeeKes - totalSasapayFeeKes) * 100) / 100,
        ledger_county_total_kes: ledgerTotals.county,
        ledger_sacco_total_kes: ledgerTotals.sacco,
        ledger_platform_total_kes: ledgerTotals.platform,
      },
      by_fee_type: byFeeType,
      by_county: byCounty,
      ledger_totals: ledgerTotals,
    });
  } catch (error) {
    console.error('getCountyReconciliation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
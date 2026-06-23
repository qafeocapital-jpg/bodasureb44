import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Revenue & Reconciliation Summary for Super Admin.
 * Aggregates completed transactions by type, computes BodaSure revenue
 * (markup) and SasaPay fees (deducted), and builds daily reconciliation.
 *
 * Payload:
 * - date_from: ISO date string (optional, default 30 days ago)
 * - date_to: ISO date string (optional, default today)
 *
 * Returns:
 * - totals: { transaction_volume_kes, bodasure_revenue_kes, sasapay_fee_total_kes, net_revenue_kes }
 * - by_type: { [type]: { count, total_amount_kes, sasapay_fee_kes, bodasure_fee_kes, total_fee_kes } }
 * - reconciliation: [{ date, count, sasapay_fee_kes, bodasure_fee_kes, net_revenue_kes, flagged }]
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { date_from, date_to } = await req.json().catch(() => ({}));

    // Default to last 30 days
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

    // Aggregate by type
    const byType = {};
    let totalVolumeKes = 0;
    let totalSasapayFeeKes = 0;
    let totalBodasureFeeKes = 0;

    for (const t of txns) {
      const type = t.type || 'unknown';
      const amountKes = (t.amount_cents || 0) / 100;
      const sasapayFeeKes = (t.sasapay_fee_kes || 0);
      const bodasureFeeKes = (t.bodasure_fee_kes || 0);
      const totalFeeKes = (t.total_fee_kes || 0);

      if (!byType[type]) {
        byType[type] = { count: 0, total_amount_kes: 0, sasapay_fee_kes: 0, bodasure_fee_kes: 0, total_fee_kes: 0 };
      }
      byType[type].count++;
      byType[type].total_amount_kes += amountKes;
      byType[type].sasapay_fee_kes += sasapayFeeKes;
      byType[type].bodasure_fee_kes += bodasureFeeKes;
      byType[type].total_fee_kes += totalFeeKes;

      totalVolumeKes += amountKes;
      totalSasapayFeeKes += sasapayFeeKes;
      totalBodasureFeeKes += bodasureFeeKes;
    }

    // Round all values
    for (const type of Object.keys(byType)) {
      byType[type].total_amount_kes = Math.round(byType[type].total_amount_kes * 100) / 100;
      byType[type].sasapay_fee_kes = Math.round(byType[type].sasapay_fee_kes * 100) / 100;
      byType[type].bodasure_fee_kes = Math.round(byType[type].bodasure_fee_kes * 100) / 100;
      byType[type].total_fee_kes = Math.round(byType[type].total_fee_kes * 100) / 100;
    }

    // Daily reconciliation
    const dailyMap = {};
    for (const t of txns) {
      const dateStr = t.created_date ? new Date(t.created_date).toISOString().split('T')[0] : 'unknown';
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { date: dateStr, count: 0, sasapay_fee_kes: 0, bodasure_fee_kes: 0, net_revenue_kes: 0 };
      }
      dailyMap[dateStr].count++;
      dailyMap[dateStr].sasapay_fee_kes += (t.sasapay_fee_kes || 0);
      dailyMap[dateStr].bodasure_fee_kes += (t.bodasure_fee_kes || 0);
      dailyMap[dateStr].net_revenue_kes += (t.bodasure_fee_kes || 0);
    }

    const reconciliation = Object.values(dailyMap)
      .map(d => ({
        ...d,
        sasapay_fee_kes: Math.round(d.sasapay_fee_kes * 100) / 100,
        bodasure_fee_kes: Math.round(d.bodasure_fee_kes * 100) / 100,
        net_revenue_kes: Math.round(d.net_revenue_kes * 100) / 100,
        // Flag days where SasaPay fee exceeds BodaSure revenue (net negative)
        flagged: d.net_revenue_kes < 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return Response.json({
      totals: {
        transaction_volume_kes: Math.round(totalVolumeKes * 100) / 100,
        bodasure_revenue_kes: Math.round(totalBodasureFeeKes * 100) / 100,
        sasapay_fee_total_kes: Math.round(totalSasapayFeeKes * 100) / 100,
        net_revenue_kes: Math.round((totalBodasureFeeKes - totalSasapayFeeKes) * 100) / 100,
      },
      by_type: byType,
      reconciliation,
    });
  } catch (error) {
    console.error('getRevenueSummary error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
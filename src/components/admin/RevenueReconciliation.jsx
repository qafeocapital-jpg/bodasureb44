import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatKES } from '@/lib/format';
import { Loader2, TrendingUp, AlertTriangle, Search } from 'lucide-react';

const TYPE_LABELS = {
  deposit: 'Deposits',
  lipisha: 'Lipisha (Fare Collection)',
  withdraw: 'Withdrawals',
  send: 'Send Money',
  lipa_county: 'Lipa County',
  lipa_owner: 'Lipa Owner',
  chama: 'Chama',
  insurance: 'Insurance',
  penalty: 'Penalties',
};

export default function RevenueReconciliation() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchSummary(); }, []);

  async function fetchSummary() {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getRevenueSummary', {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setData(res.data);
    } catch (e) {
      console.error('Revenue summary error:', e);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      {/* Date Range Filter */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </div>
        <button onClick={fetchSummary} disabled={loading} className="flex items-center gap-1 bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Fetch
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-muted-foreground animate-spin" /></div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground text-center py-10">No data available</p>
      ) : (
        <>
          {/* Earnings Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Transaction Volume</p></div>
              <p className="text-xl font-heading font-bold">{formatKES(Math.round(data.totals.transaction_volume_kes * 100))}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">BodaSure Revenue (Markup)</p>
              <p className="text-xl font-heading font-bold text-success">{formatKES(Math.round(data.totals.bodasure_revenue_kes * 100))}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">SasaPay Fees (Deducted)</p>
              <p className="text-xl font-heading font-bold text-destructive">{formatKES(Math.round(data.totals.sasapay_fee_total_kes * 100))}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Net BodaSure Revenue</p>
              <p className={`text-xl font-heading font-bold ${data.totals.net_revenue_kes >= 0 ? 'text-success' : 'text-destructive'}`}>{formatKES(Math.round(data.totals.net_revenue_kes * 100))}</p>
            </div>
          </div>

          {/* Per-Type Breakdown */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-muted px-4 py-2.5">
              <h3 className="font-heading font-bold text-sm">Revenue by Transaction Type</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Count</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Volume</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">SasaPay Fee</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">BodaSure Markup</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.by_type).map(([type, vals]) => (
                    <tr key={type} className="border-b border-border/50 hover:bg-accent/30">
                      <td className="px-4 py-2.5 font-medium">{TYPE_LABELS[type] || type}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{vals.count}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatKES(Math.round(vals.total_amount_kes * 100))}</td>
                      <td className="px-4 py-2.5 text-right text-destructive">{formatKES(Math.round(vals.sasapay_fee_kes * 100))}</td>
                      <td className="px-4 py-2.5 text-right text-success">{formatKES(Math.round(vals.bodasure_fee_kes * 100))}</td>
                      <td className="px-4 py-2.5 text-right font-bold">{formatKES(Math.round(vals.total_fee_kes * 100))}</td>
                    </tr>
                  ))}
                  {Object.keys(data.by_type).length === 0 && (
                    <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No transactions in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reconciliation */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-muted px-4 py-2.5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <h3 className="font-heading font-bold text-sm">Daily Reconciliation</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Txns</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">SasaPay Deducted</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">BodaSure Earned</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Net</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.reconciliation.map(day => (
                    <tr key={day.date} className={`border-b border-border/50 ${day.flagged ? 'bg-warning/5' : ''}`}>
                      <td className="px-4 py-2.5 font-medium">{day.date}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{day.count}</td>
                      <td className="px-4 py-2.5 text-right text-destructive">{formatKES(Math.round(day.sasapay_fee_kes * 100))}</td>
                      <td className="px-4 py-2.5 text-right text-success">{formatKES(Math.round(day.bodasure_fee_kes * 100))}</td>
                      <td className={`px-4 py-2.5 text-right font-bold ${day.net_revenue_kes >= 0 ? 'text-success' : 'text-destructive'}`}>{formatKES(Math.round(day.net_revenue_kes * 100))}</td>
                      <td className="px-4 py-2.5 text-right">
                        {day.flagged && <span className="text-xs font-semibold text-warning bg-warning/10 rounded-full px-2 py-0.5">Review</span>}
                      </td>
                    </tr>
                  ))}
                  {data.reconciliation.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No data in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
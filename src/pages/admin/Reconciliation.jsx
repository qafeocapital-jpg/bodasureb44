import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatKES } from '@/lib/format';
import { Loader2, Search, TrendingUp, Building2, Scale, Coins } from 'lucide-react';

const FEE_TYPE_LABELS = {
  deposit: 'Deposits',
  lipisha: 'Lipisha (Fare Collection)',
  withdraw: 'Withdrawals',
  send: 'Send Money',
  lipa_county: 'Lipa County',
  lipa_owner: 'Lipa Owner',
  chama: 'Chama',
  insurance: 'Insurance',
  penalty: 'Penalties',
  utility: 'Utilities',
};

export default function Reconciliation() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchSummary(); }, []);

  async function fetchSummary() {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getCountyReconciliation', {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setData(res.data);
    } catch (e) {
      console.error('Reconciliation error:', e);
    }
    setLoading(false);
  }

  const countyRows = data ? Object.entries(data.by_county).sort((a, b) => b[1].total_amount_kes - a[1].total_amount_kes) : [];
  const feeTypeRows = data ? Object.entries(data.by_fee_type).sort((a, b) => b[1].total_amount_kes - a[1].total_amount_kes) : [];

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Reconciliation</h1>
      <p className="text-sm text-muted-foreground mb-5">Total earnings by fee type and county — internal ledger vs transaction splits</p>

      {/* Date Range Filter */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-3 mb-5">
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
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Transaction Volume</p></div>
              <p className="text-xl font-heading font-bold">{formatKES(Math.round(data.totals.transaction_volume_kes * 100))}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1"><Coins className="w-4 h-4 text-success" /><p className="text-xs text-muted-foreground">BodaSure Revenue</p></div>
              <p className="text-xl font-heading font-bold text-success">{formatKES(Math.round(data.totals.bodasure_revenue_kes * 100))}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1"><Scale className="w-4 h-4 text-destructive" /><p className="text-xs text-muted-foreground">SasaPay Fees</p></div>
              <p className="text-xl font-heading font-bold text-destructive">{formatKES(Math.round(data.totals.sasapay_fee_total_kes * 100))}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1"><Building2 className="w-4 h-4 text-primary" /><p className="text-xs text-muted-foreground">County Ledger Total</p></div>
              <p className="text-xl font-heading font-bold text-primary">{formatKES(Math.round(data.totals.ledger_county_total_kes * 100))}</p>
            </div>
          </div>

          {/* Internal Ledger Totals */}
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <h3 className="font-heading font-bold text-sm mb-3 flex items-center gap-2"><Scale className="w-4 h-4" /> Internal Ledger Splits (All Counties)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">County Share</p>
                <p className="text-lg font-bold text-primary">{formatKES(Math.round(data.ledger_totals.county * 100))}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">SACCO Share</p>
                <p className="text-lg font-bold text-blue-500">{formatKES(Math.round(data.ledger_totals.sacco * 100))}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Platform Share</p>
                <p className="text-lg font-bold text-orange-500">{formatKES(Math.round(data.ledger_totals.platform * 100))}</p>
              </div>
            </div>
          </div>

          {/* By Fee Type Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
            <div className="bg-muted px-4 py-2.5">
              <h3 className="font-heading font-bold text-sm">Earnings by Fee Type</h3>
              <p className="text-xs text-muted-foreground">Transaction split totals — volume, SasaPay fees, and BodaSure markup per transaction type</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Fee Type</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Count</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Volume</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">SasaPay Fee</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">BodaSure Markup</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {feeTypeRows.map(([type, v]) => (
                    <tr key={type} className="border-b border-border/50 hover:bg-accent/30">
                      <td className="px-4 py-2.5 font-medium">{FEE_TYPE_LABELS[type] || type}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{v.count}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatKES(Math.round(v.total_amount_kes * 100))}</td>
                      <td className="px-4 py-2.5 text-right text-destructive">{formatKES(Math.round(v.sasapay_fee_kes * 100))}</td>
                      <td className="px-4 py-2.5 text-right text-success">{formatKES(Math.round(v.bodasure_fee_kes * 100))}</td>
                      <td className="px-4 py-2.5 text-right font-bold">{formatKES(Math.round(v.total_fee_kes * 100))}</td>
                    </tr>
                  ))}
                  {feeTypeRows.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No transactions in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* By County Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-muted px-4 py-2.5">
              <h3 className="font-heading font-bold text-sm">Earnings by County</h3>
              <p className="text-xs text-muted-foreground">Internal ledger amounts — county, SACCO, and platform shares per county</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">County</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Txns</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total Volume</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">County Share</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">SACCO Share</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Platform Share</th>
                  </tr>
                </thead>
                <tbody>
                  {countyRows.map(([countyId, v]) => (
                    <tr key={countyId} className="border-b border-border/50 hover:bg-accent/30">
                      <td className="px-4 py-2.5 font-medium">{v.county_name}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{v.transaction_count}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatKES(Math.round(v.total_amount_kes * 100))}</td>
                      <td className="px-4 py-2.5 text-right text-primary font-medium">{formatKES(Math.round(v.county_share_kes * 100))}</td>
                      <td className="px-4 py-2.5 text-right text-blue-500 font-medium">{formatKES(Math.round(v.sacco_share_kes * 100))}</td>
                      <td className="px-4 py-2.5 text-right text-orange-500 font-medium">{formatKES(Math.round(v.platform_share_kes * 100))}</td>
                    </tr>
                  ))}
                  {countyRows.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No county data in this period</td></tr>
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
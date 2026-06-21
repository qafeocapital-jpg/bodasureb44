import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatKES, formatDateTime } from '@/lib/format';
import { Landmark, TrendingUp, FileText, Banknote } from 'lucide-react';

export default function CountyRevenue() {
  const [tab, setTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [txns, setts] = await Promise.all([
        base44.entities.Transaction.filter({ type: 'lipa_county' }, '-created_date', 50),
        base44.entities.Settlement.filter({ entity_type: 'county' }, '-created_date', 20),
      ]);
      setTransactions(txns); setSettlements(setts);
    } catch (e) {}
    setLoading(false);
  }

  const totalRevenue = transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.amount_cents || 0), 0);

  const tabs = [
    { id: 'dashboard', label: 'Revenue', icon: TrendingUp },
    { id: 'ledger', label: 'Ledger', icon: FileText },
    { id: 'settlements', label: 'Settlements', icon: Banknote },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Revenue</h1>
      <p className="text-sm text-muted-foreground mb-5">Track collections and settlements</p>

      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-emerald-600 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : tab === 'dashboard' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 mb-3"><Landmark className="w-5 h-5" /></div>
              <p className="text-2xl font-heading font-bold">{formatKES(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 mb-3"><FileText className="w-5 h-5" /></div>
              <p className="text-2xl font-heading font-bold">{transactions.length}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-50 text-violet-600 mb-3"><Banknote className="w-5 h-5" /></div>
              <p className="text-2xl font-heading font-bold">{settlements.length}</p>
              <p className="text-xs text-muted-foreground">Settlements</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 mb-3"><TrendingUp className="w-5 h-5" /></div>
              <p className="text-2xl font-heading font-bold">0</p>
              <p className="text-xs text-muted-foreground">Arrears</p>
            </div>
          </div>
        </div>
      ) : tab === 'ledger' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-mono text-xs">{t.reference}</td>
                  <td className="px-4 py-3 font-semibold">{formatKES(t.amount_cents)}</td>
                  <td className="px-4 py-3"><span className="text-xs font-semibold text-success">{t.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDateTime(t.created_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No transactions yet</p>}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Bank Ref</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map(s => (
                <tr key={s.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-semibold">{formatKES(s.amount_cents)}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${s.status === 'processed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{s.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.bank_reference || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDateTime(s.settled_at || s.created_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {settlements.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No settlements yet</p>}
        </div>
      )}
    </div>
  );
}
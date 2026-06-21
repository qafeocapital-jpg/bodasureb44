import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatKES, formatDateTime } from '@/lib/format';
import { Database, Search, Activity, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminSasaPay() {
  const [tab, setTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [events, setEvents] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [t, e, w] = await Promise.all([
        base44.entities.Transaction.filter({}, '-created_date', 30),
        base44.entities.PaymentEvent.filter({}, '-created_date', 20),
        base44.entities.Wallet.filter({ entity_type: 'personal' }),
      ]);
      setTransactions(t); setEvents(e); setWallets(w);
    } catch (e) {}
    setLoading(false);
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'transactions', label: 'Transactions', icon: Database },
    { id: 'wallets', label: 'Customer Accounts', icon: CheckCircle2 },
    { id: 'webhooks', label: 'Webhook Log', icon: AlertCircle },
  ];

  const filteredTxns = transactions.filter(t => !search || t.reference?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">SasaPay Operations</h1>
      <p className="text-sm text-muted-foreground mb-5">Monitor wallets, transactions, and webhooks</p>

      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-orange-500 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : tab === 'overview' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4"><p className="text-2xl font-heading font-bold">{wallets.length}</p><p className="text-xs text-muted-foreground">Wallets</p></div>
          <div className="bg-card border border-border rounded-xl p-4"><p className="text-2xl font-heading font-bold">{transactions.length}</p><p className="text-xs text-muted-foreground">Transactions</p></div>
          <div className="bg-card border border-border rounded-xl p-4"><p className="text-2xl font-heading font-bold text-success">{transactions.filter(t => t.status === 'completed').length}</p><p className="text-xs text-muted-foreground">Completed</p></div>
          <div className="bg-card border border-border rounded-xl p-4"><p className="text-2xl font-heading font-bold text-destructive">{transactions.filter(t => t.status === 'failed').length}</p><p className="text-xs text-muted-foreground">Failed</p></div>
        </div>
      ) : tab === 'transactions' ? (
        <div>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by reference..." className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxns.map(t => (
                  <tr key={t.id} className="border-t border-border hover:bg-accent/50">
                    <td className="px-4 py-3 font-mono text-xs">{t.reference}</td>
                    <td className="px-4 py-3 capitalize">{t.type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 font-semibold">{formatKES(t.amount_cents)}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-semibold ${t.status === 'completed' ? 'text-success' : 'text-warning'}`}>{t.status}</span></td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDateTime(t.created_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'wallets' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tier</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map(w => (
                <tr key={w.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-mono text-xs">{w.account_number || w.sasapay_customer_id || '—'}</td>
                  <td className="px-4 py-3">Tier {w.tier}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold ${w.status === 'active' ? 'text-success' : 'text-muted-foreground'}`}>{w.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {wallets.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No wallets yet</p>}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Processed</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3">{e.event_type}</td>
                  <td className="px-4 py-3 font-mono text-xs">{e.reference}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold ${e.processed ? 'text-success' : 'text-warning'}`}>{e.processed ? 'Yes' : 'No'}</span></td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDateTime(e.processed_at || e.created_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No webhook events</p>}
        </div>
      )}
    </div>
  );
}
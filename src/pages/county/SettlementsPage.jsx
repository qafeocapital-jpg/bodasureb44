import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES, formatKESShort, formatDate, formatDateTime } from '@/lib/format';
import { Banknote, Clock, CheckCircle2, XCircle, Landmark } from 'lucide-react';

export default function CountySettlements() {
  const { user } = useAuth();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const data = await base44.entities.Settlement.filter(
        countyId ? { entity_type: 'county', entity_id: countyId } : { entity_type: 'county' },
        '-created_date', 100
      );
      setSettlements(data);
    } catch (e) { console.error('Settlements load error:', e); }
    setLoading(false);
  }

  const filtered = filter === 'all' ? settlements : settlements.filter(s => s.status === filter);

  const totalValue = settlements.reduce((s, x) => s + (x.amount_cents || 0), 0);
  const processed = settlements.filter(s => s.status === 'processed');
  const pending = settlements.filter(s => s.status === 'pending');
  const failed = settlements.filter(s => s.status === 'failed');

  const stats = [
    { label: 'Total Settlements', value: settlements.length, icon: Banknote, color: 'bg-orange-50 text-[#ff5a1f]' },
    { label: 'Total Value', value: formatKESShort(totalValue), icon: Landmark, color: 'bg-orange-50 text-[#ff5a1f]' },
    { label: 'Processed', value: processed.length, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
    { label: 'Pending', value: pending.length, icon: Clock, color: 'bg-amber-50 text-amber-600' },
  ];

  const tabs = [
    { id: 'all', label: 'All', count: settlements.length },
    { id: 'pending', label: 'Pending', count: pending.length },
    { id: 'processed', label: 'Processed', count: processed.length },
    { id: 'failed', label: 'Failed', count: failed.length },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <Banknote className="w-6 h-6 text-[#ff5a1f]" />
        <h1 className="text-2xl font-heading font-bold">Settlements</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Track county settlement cycles and bank transfers</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {stats.map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-heading font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === t.id ? 'bg-[#ff5a1f] text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            {t.label}
            <span className={`ml-2 text-xs rounded-full px-1.5 py-0.5 ${filter === t.id ? 'bg-white/20' : 'bg-accent'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Txns</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Period</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Settled At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-mono text-xs">{s.bank_reference || s.id.substring(0, 12)}</td>
                  <td className="px-4 py-3 font-semibold">{formatKES(s.amount_cents)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.transaction_ids?.length || 0}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                    {s.period_start ? formatDate(s.period_start) : '—'} → {s.period_end ? formatDate(s.period_end) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${s.status === 'processed' ? 'bg-success/10 text-success' : s.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{s.settled_at ? formatDateTime(s.settled_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8">
              <XCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No settlements found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
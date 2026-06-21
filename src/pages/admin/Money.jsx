import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatKES } from '@/lib/format';
import { Coins, Percent, Banknote, Scale } from 'lucide-react';

export default function AdminMoney() {
  const [tab, setTab] = useState('fees');
  const [feeRules, setFeeRules] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        base44.entities.FeeRule.filter({ is_active: true }),
        base44.entities.Settlement.filter({}, '-created_date', 20),
      ]);
      setFeeRules(r); setSettlements(s);
    } catch (e) {}
    setLoading(false);
  }

  const tabs = [
    { id: 'fees', label: 'Fee Rules', icon: Percent },
    { id: 'settlements', label: 'Settlements', icon: Banknote },
    { id: 'disputes', label: 'Disputes', icon: Scale },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Money Configuration</h1>
      <p className="text-sm text-muted-foreground mb-5">Configure fees, settlements, and disputes</p>

      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-orange-500 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : tab === 'fees' ? (
        <div className="space-y-3">
          {feeRules.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-orange-600" />
                  <p className="font-heading font-bold text-sm">{r.name}</p>
                </div>
                <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5 capitalize">{r.product_type.replace(/_/g, ' ')}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-accent rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-emerald-600">{r.county_percentage}%</p>
                  <p className="text-[10px] text-muted-foreground">County</p>
                </div>
                <div className="bg-accent rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-blue-600">{r.sacco_percentage}%</p>
                  <p className="text-[10px] text-muted-foreground">SACCO</p>
                </div>
                <div className="bg-accent rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-orange-600">{r.platform_percentage}%</p>
                  <p className="text-[10px] text-muted-foreground">Platform</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'settlements' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entity</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map(s => (
                <tr key={s.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 capitalize">{s.entity_type}</td>
                  <td className="px-4 py-3 font-semibold">{formatKES(s.amount_cents)}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${s.status === 'processed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {settlements.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No settlements</p>}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Scale className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No payment disputes</p>
        </div>
      )}
    </div>
  );
}
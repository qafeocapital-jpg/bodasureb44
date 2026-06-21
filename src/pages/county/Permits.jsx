import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatKES, formatDate } from '@/lib/format';
import { BadgeCheck, BarChart3, Plus, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function CountyPermits() {
  const [tab, setTab] = useState('register');
  const [permits, setPermits] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ permit_type: 'weekly', amount_cents: '', penalty_amount_cents: '', grace_period_days: '7' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        base44.entities.Permit.filter({}, '-created_date', 50),
        base44.entities.FeeSchedule.filter({ is_active: true }),
      ]);
      setPermits(p); setSchedules(s);
    } catch (e) {}
    setLoading(false);
  }

  async function addSchedule() {
    const cents = Math.round(parseFloat(newSchedule.amount_cents) * 100);
    if (!cents) return;
    const u = await base44.auth.me();
    await base44.entities.FeeSchedule.create({
      county_id: u.scope_entity_id || u.county_id || 'general',
      permit_type: newSchedule.permit_type,
      amount_cents: cents,
      penalty_amount_cents: Math.round(parseFloat(newSchedule.penalty_amount_cents || '0') * 100),
      grace_period_days: parseInt(newSchedule.grace_period_days) || 7,
      is_active: true,
    });
    setShowAddSchedule(false);
    setNewSchedule({ permit_type: 'weekly', amount_cents: '', penalty_amount_cents: '', grace_period_days: '7' });
    load();
  }

  // Analytics data
  const analytics = ['weekly', 'monthly', 'quarterly', 'yearly'].map(cycle => ({
    name: cycle,
    count: permits.filter(p => p.billing_cycle === cycle).length,
  }));

  const tabs = [
    { id: 'register', label: 'Permit Register', icon: BadgeCheck },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'schedules', label: 'Fee Schedules', icon: TrendingUp },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Permits</h1>
      <p className="text-sm text-muted-foreground mb-5">Manage permits and fee schedules</p>

      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-emerald-600 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : tab === 'register' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cycle</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Start</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">End</th>
              </tr>
            </thead>
            <tbody>
              {permits.map(p => (
                <tr key={p.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium capitalize">{p.billing_cycle}</td>
                  <td className="px-4 py-3">{formatKES(p.amount_paid_cents)}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${p.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{p.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(p.start_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(p.end_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {permits.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No permits issued</p>}
        </div>
      ) : tab === 'analytics' ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-heading font-bold mb-4">Permit Sales by Cycle</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowAddSchedule(true)} className="flex items-center gap-1 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-semibold">
              <Plus className="w-4 h-4" /> Add Schedule
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {schedules.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-xl p-4">
                <p className="font-heading font-bold capitalize">{s.permit_type}</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{formatKES(s.amount_cents)}</p>
                <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                  <p>Penalty: {formatKES(s.penalty_amount_cents || 0)}</p>
                  <p>Grace: {s.grace_period_days} days</p>
                </div>
              </div>
            ))}
            {schedules.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">No fee schedules set</p>}
          </div>

          {showAddSchedule && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddSchedule(false)} />
              <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
                <h3 className="font-heading font-bold text-lg mb-4">Add Fee Schedule</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Permit Type</label>
                    <select value={newSchedule.permit_type} onChange={e => setNewSchedule(s => ({ ...s, permit_type: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Amount (KES)</label>
                    <input type="number" value={newSchedule.amount_cents} onChange={e => setNewSchedule(s => ({ ...s, amount_cents: e.target.value }))} placeholder="500" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Penalty (KES)</label>
                    <input type="number" value={newSchedule.penalty_amount_cents} onChange={e => setNewSchedule(s => ({ ...s, penalty_amount_cents: e.target.value }))} placeholder="100" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Grace Period (days)</label>
                    <input type="number" value={newSchedule.grace_period_days} onChange={e => setNewSchedule(s => ({ ...s, grace_period_days: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setShowAddSchedule(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                    <button onClick={addSchedule} className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold">Save</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
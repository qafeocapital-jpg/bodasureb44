import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatKES, formatDate } from '@/lib/format';
import { auditLog } from '@/lib/audit';
import { BadgeCheck, BarChart3, Plus, TrendingUp, Calendar, Pencil } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function CountyPermits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('register');
  const [permits, setPermits] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ permit_type: 'weekly', amount_cents: '', penalty_amount_cents: '', grace_period_days: '7' });
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({ vehicle_id: '', billing_cycle: 'weekly', start_date: new Date().toISOString().split('T')[0] });
  const [issuing, setIssuing] = useState(false);

  const countyId = user?.scope_entity_id || user?.county_id;

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const permitFilter = countyId ? { county_id: countyId } : {};
      const vehicleFilter = countyId ? { county_id: countyId, status: 'approved' } : { status: 'approved' };
      const scheduleFilter = countyId ? { county_id: countyId, is_active: true } : { is_active: true };
      const [p, s, v] = await Promise.all([
        base44.entities.Permit.filter(permitFilter, '-created_date', 50),
        base44.entities.FeeSchedule.filter(scheduleFilter),
        base44.entities.Vehicle.filter(vehicleFilter),
      ]);
      setPermits(p); setSchedules(s); setVehicles(v);
    } catch (e) {}
    setLoading(false);
  }

  async function addSchedule() {
    const cents = Math.round(parseFloat(newSchedule.amount_cents) * 100);
    if (!cents) return;
    const u = await base44.auth.me();
    const created = await base44.entities.FeeSchedule.create({
      county_id: countyId || 'general',
      permit_type: newSchedule.permit_type,
      amount_cents: cents,
      penalty_amount_cents: Math.round(parseFloat(newSchedule.penalty_amount_cents || '0') * 100),
      grace_period_days: parseInt(newSchedule.grace_period_days) || 7,
      is_active: true,
    });
    await auditLog({ userId: u.id, action: 'fee_schedule_created', entityType: 'FeeSchedule', entityId: created.id, description: `Fee schedule created: ${newSchedule.permit_type} @ ${cents} cents` });
    toast({ title: 'Fee Schedule Created' });
    setShowAddSchedule(false);
    setNewSchedule({ permit_type: 'weekly', amount_cents: '', penalty_amount_cents: '', grace_period_days: '7' });
    load();
  }

  async function issuePermit() {
    if (!issueForm.vehicle_id || !issueForm.billing_cycle) return;
    const vehicle = vehicles.find(v => v.id === issueForm.vehicle_id);
    if (!vehicle) return;

    const startDate = new Date(issueForm.start_date || new Date());
    const cycleDays = { weekly: 7, monthly: 30, quarterly: 90, yearly: 365 };
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (cycleDays[issueForm.billing_cycle] || 30));

    setIssuing(true);
    try {
      const u = await base44.auth.me();
      const ts = Date.now().toString();
      const permit = await base44.entities.Permit.create({
        vehicle_id: issueForm.vehicle_id,
        rider_id: vehicle.rider_id || vehicle.owner_id,
        county_id: countyId || vehicle.county_id || 'general',
        billing_cycle: issueForm.billing_cycle,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        issued_manually: true,
        qr_code_data: `BODASURE-${issueForm.vehicle_id}-${ts}`,
      });
      await auditLog({ userId: u.id, action: 'permit_issued_manual', entityType: 'Permit', entityId: permit.id, description: `Manual permit issued for vehicle ${vehicle.plate_number}` });
      toast({ title: 'Permit Issued', description: `${vehicle.plate_number} — ${issueForm.billing_cycle}` });
      setShowIssueModal(false);
      setIssueForm({ vehicle_id: '', billing_cycle: 'weekly', start_date: new Date().toISOString().split('T')[0] });
      load();
    } catch (e) {
      toast({ title: 'Failed to issue permit', description: e.message, variant: 'destructive' });
    }
    setIssuing(false);
  }

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
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowIssueModal(true)} className="flex items-center gap-1 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-semibold">
              <Calendar className="w-4 h-4" /> Issue Manually
            </button>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cycle</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Start</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">End</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Type</th>
                </tr>
              </thead>
              <tbody>
                {permits.map(p => (
                  <tr key={p.id} className="border-t border-border hover:bg-accent/50">
                    <td className="px-4 py-3 font-medium capitalize">{p.billing_cycle}</td>
                    <td className="px-4 py-3">{formatKES(p.amount_paid_cents)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${p.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{p.status}</span>
                        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${p.permit_type === 'provisional' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {p.permit_type === 'provisional' ? 'Provisional' : 'Full'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(p.start_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(p.end_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{p.issued_manually ? 'Manual' : 'Online'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {permits.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No permits issued</p>}
          </div>
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

      {/* Issue Permit Manually Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowIssueModal(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-heading font-bold text-lg mb-4">Issue Permit Manually</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Vehicle</label>
                <select value={issueForm.vehicle_id} onChange={e => setIssueForm(f => ({ ...f, vehicle_id: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                  <option value="">Select approved vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Billing Cycle</label>
                <select value={issueForm.billing_cycle} onChange={e => setIssueForm(f => ({ ...f, billing_cycle: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                <input type="date" value={issueForm.start_date} onChange={e => setIssueForm(f => ({ ...f, start_date: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowIssueModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={issuePermit} disabled={!issueForm.vehicle_id || issuing} className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                  {issuing ? 'Issuing...' : 'Issue Permit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
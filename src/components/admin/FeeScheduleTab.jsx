import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { formatKES } from '@/lib/format';
import { auditLog } from '@/lib/audit';
import { Plus, Pencil, Calendar } from 'lucide-react';

export default function FeeScheduleTab() {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ county_id: '', permit_type: 'weekly', amount_cents: 0, penalty_amount_cents: 0, grace_period_days: 7, is_active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        base44.entities.FeeSchedule.filter({}),
        base44.entities.County.filter({}),
      ]);
      setSchedules(s);
      setCounties(c);
    } catch (e) {}
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ county_id: counties[0]?.id || '', permit_type: 'weekly', amount_cents: 0, penalty_amount_cents: 0, grace_period_days: 7, is_active: true });
    setShowModal(true);
  }

  function openEdit(s) {
    setEditing(s);
    setForm({ county_id: s.county_id, permit_type: s.permit_type, amount_cents: s.amount_cents, penalty_amount_cents: s.penalty_amount_cents || 0, grace_period_days: s.grace_period_days || 7, is_active: s.is_active });
    setShowModal(true);
  }

  async function save() {
    if (!form.county_id || !form.permit_type || !form.amount_cents) return;
    setSaving(true);
    try {
      const u = await base44.auth.me();
      const county = counties.find(c => c.id === form.county_id);
      if (editing) {
        await base44.entities.FeeSchedule.update(editing.id, {
          county_id: form.county_id,
          permit_type: form.permit_type,
          amount_cents: Number(form.amount_cents),
          penalty_amount_cents: Number(form.penalty_amount_cents),
          grace_period_days: Number(form.grace_period_days),
          is_active: form.is_active,
        });
        await auditLog({ userId: u.id, action: 'fee_schedule_updated', entityType: 'FeeSchedule', entityId: editing.id, description: `Fee schedule updated for ${county?.name} (${form.permit_type})` });
      } else {
        const created = await base44.entities.FeeSchedule.create({
          county_id: form.county_id,
          permit_type: form.permit_type,
          amount_cents: Number(form.amount_cents),
          penalty_amount_cents: Number(form.penalty_amount_cents),
          grace_period_days: Number(form.grace_period_days),
          is_active: form.is_active,
        });
        await auditLog({ userId: u.id, action: 'fee_schedule_created', entityType: 'FeeSchedule', entityId: created.id, description: `Fee schedule created for ${county?.name} (${form.permit_type})` });
      }
      setShowModal(false);
      toast({ title: 'Fee schedule saved' });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  async function toggleActive(s) {
    try {
      await base44.entities.FeeSchedule.update(s.id, { is_active: !s.is_active });
      load();
    } catch (e) {}
  }

  const grouped = {};
  schedules.forEach(s => {
    const key = s.county_id || 'unknown';
    if (!grouped[key]) grouped[key] = { county: counties.find(c => c.id === key), schedules: [] };
    grouped[key].schedules.push(s);
  });

  if (loading) return <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="flex items-center gap-1 bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
          <Plus className="w-4 h-4" /> Create Schedule
        </button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No fee schedules configured. Create one to set permit pricing per county.</p>
        </div>
      ) : (
        Object.values(grouped).map(g => (
          <div key={g.county?.id || 'unknown'} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-muted border-b border-border">
              <p className="font-heading font-bold text-sm">{g.county?.name || 'Unknown County'}</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Permit Type</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Amount</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Penalty</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Grace (days)</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Active</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {g.schedules.map(s => (
                  <tr key={s.id} className="border-t border-border hover:bg-accent/50">
                    <td className="px-4 py-3 capitalize font-medium">{s.permit_type}</td>
                    <td className="px-4 py-3 font-semibold">{formatKES(s.amount_cents)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatKES(s.penalty_amount_cents)}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.grace_period_days}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(s)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${s.is_active ? 'bg-success' : 'bg-muted'}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${s.is_active ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(s)} className="text-muted-foreground hover:text-foreground">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="font-heading font-bold text-lg mb-4">{editing ? 'Edit Fee Schedule' : 'Create Fee Schedule'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">County</label>
                <select value={form.county_id} onChange={e => setForm(f => ({ ...f, county_id: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                  <option value="">Select county</option>
                  {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Permit Type</label>
                <select value={form.permit_type} onChange={e => setForm(f => ({ ...f, permit_type: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Amount (KES)</label>
                <input type="number" value={form.amount_cents ? form.amount_cents / 100 : ''} onChange={e => setForm(f => ({ ...f, amount_cents: Math.round(parseFloat(e.target.value || 0) * 100) }))} placeholder="0" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Penalty Amount (KES)</label>
                <input type="number" value={form.penalty_amount_cents ? form.penalty_amount_cents / 100 : ''} onChange={e => setForm(f => ({ ...f, penalty_amount_cents: Math.round(parseFloat(e.target.value || 0) * 100) }))} placeholder="0" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Grace Period (days)</label>
                <input type="number" value={form.grace_period_days} onChange={e => setForm(f => ({ ...f, grace_period_days: parseInt(e.target.value || 0) }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Active</label>
                <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.is_active ? 'bg-success' : 'bg-muted'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-4' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={save} disabled={!form.county_id || !form.amount_cents || saving} className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
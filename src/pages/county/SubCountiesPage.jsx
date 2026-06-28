import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { auditLog } from '@/lib/audit';
import { Grid2x2, Plus, Pencil, X, Loader2, Map } from 'lucide-react';

export default function CountySubCounties() {
  const { user } = useAuth();
  const { toast } = useToast();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [subCounties, setSubCounties] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const [sc, w] = await Promise.all([
        countyId ? base44.entities.SubCounty.filter({ county_id: countyId }) : base44.entities.SubCounty.filter({}),
        countyId ? base44.entities.Ward.filter({ county_id: countyId }) : base44.entities.Ward.filter({}),
      ]);
      setSubCounties(sc); setWards(w);
    } catch (e) { console.error('SubCounties load error:', e); }
    setLoading(false);
  }

  async function handleSubmit() {
    if (!form.name) return;
    setSaving(true);
    try {
      const u = await base44.auth.me();
      if (editing) {
        await base44.entities.SubCounty.update(editing.id, { name: form.name, description: form.description });
        await auditLog({ userId: u.id, action: 'subcounty_updated', entityType: 'SubCounty', entityId: editing.id, description: `Sub-county "${form.name}" updated` });
        toast({ title: 'Sub-county updated' });
      } else {
        const created = await base44.entities.SubCounty.create({ name: form.name, description: form.description, county_id: countyId || '' });
        await auditLog({ userId: u.id, action: 'subcounty_created', entityType: 'SubCounty', entityId: created.id, description: `Sub-county "${form.name}" created` });
        toast({ title: 'Sub-county created' });
      }
      setShowModal(false); setEditing(null); setForm({ name: '', description: '' });
      load();
    } catch (e) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
    setSaving(false);
  }

  function openEdit(sc) {
    setEditing(sc);
    setForm({ name: sc.name, description: sc.description || '' });
    setShowModal(true);
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Grid2x2 className="w-6 h-6 text-[#ff5a1f]" />
            <h1 className="text-2xl font-heading font-bold">Sub-Counties</h1>
          </div>
          <p className="text-sm text-muted-foreground">Manage geographic boundaries and enforcement zones</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', description: '' }); setShowModal(true); }} className="flex items-center gap-1 bg-[#ff5a1f] text-white rounded-lg px-4 py-2 text-sm font-semibold">
          <Plus className="w-4 h-4" /> Add Sub-County
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : subCounties.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Map className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No sub-counties defined yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subCounties.map(sc => {
            const scWards = wards.filter(w => w.sub_county_id === sc.id);
            return (
              <div key={sc.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Map className="w-4 h-4 text-[#ff5a1f]" />
                    <p className="font-heading font-bold text-sm">{sc.name}</p>
                  </div>
                  <button onClick={() => openEdit(sc)} className="text-muted-foreground hover:text-foreground p-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{scWards.length} ward(s)</p>
                {sc.description && <p className="text-xs text-muted-foreground mt-1">{sc.description}</p>}
                {scWards.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-1">
                    {scWards.slice(0, 4).map(w => (
                      <span key={w.id} className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5">{w.name}</span>
                    ))}
                    {scWards.length > 4 && <span className="text-[10px] text-muted-foreground">+{scWards.length - 4} more</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">{editing ? 'Edit Sub-County' : 'Add Sub-County'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kisumu East" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={handleSubmit} disabled={!form.name || saving} className="flex-1 bg-[#ff5a1f] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editing ? 'Save' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate, formatKES } from '@/lib/format';
import { Building2, Plus, Pencil, Trash2, Loader2, X, Banknote, Users, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SaccoPendingMembers from '@/components/admin/SaccoPendingMembers';

const KENYAN_BANKS = [
  'Kenya Commercial Bank (KCB)', 'Equity Bank', 'Cooperative Bank', 'Standard Chartered',
  'Absa Bank Kenya', 'NCBA Bank', 'I&M Bank', 'Stanbic Bank', 'Diamond Trust Bank',
  'Sidian Bank', 'Family Bank', 'Guardian Bank', 'Gulf African Bank', 'National Bank of Kenya',
];

export default function AdminSaccos() {
  const { toast } = useToast();
  const [groups, setGroups] = useState([]);
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [tab, setTab] = useState('saccos');

  const [form, setForm] = useState({
    name: '', type: 'sacco', county_id: '', status: 'active', description: '',
    sasapay_account_number: '',
    bank_name: '', bank_account_name: '', bank_account_number: '', bank_branch: '',
    mpesa_till_number: '', official_name: '', official_phone: '', official_email: '',
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [saccos, cs] = await Promise.all([
        base44.entities.Group.filter({ type: 'sacco' }, '-created_date', 100),
        base44.entities.County.filter({}),
      ]);
      setGroups(saccos);
      setCounties(cs);
    } catch (e) {}
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({
      name: '', type: 'sacco', county_id: '', status: 'active', description: '',
      sasapay_account_number: '',
      bank_name: '', bank_account_name: '', bank_account_number: '', bank_branch: '',
      mpesa_till_number: '', official_name: '', official_phone: '', official_email: '',
    });
    setShowModal(true);
  }

  function openEdit(g) {
    setEditing(g);
    setForm({
      name: g.name || '', type: g.type || 'sacco', county_id: g.county_id || '', status: g.status || 'active', description: g.description || '',
      sasapay_account_number: g.sasapay_account_number || '',
      bank_name: g.bank_name || '', bank_account_name: g.bank_account_name || '', bank_account_number: g.bank_account_number || '', bank_branch: g.bank_branch || '',
      mpesa_till_number: g.mpesa_till_number || '', official_name: g.official_name || '', official_phone: g.official_phone || '', official_email: g.official_email || '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.county_id) {
      toast({ title: 'Missing fields', description: 'Name and county are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.Group.update(editing.id, form);
        toast({ title: 'SACCO updated' });
      } else {
        await base44.entities.Group.create(form);
        toast({ title: 'SACCO created' });
      }
      setShowModal(false);
      load();
    } catch (e) {
      toast({ title: 'Failed to save', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await base44.entities.Group.delete(id);
      toast({ title: 'SACCO deleted' });
      load();
    } catch (e) {
      toast({ title: 'Failed to delete', description: e.message, variant: 'destructive' });
    }
    setDeleting(null);
  }

  const countyName = (id) => counties.find(c => c.id === id)?.name || '—';

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-heading font-bold">SACCOs</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage SACCOs and their bank details</p>
        </div>
        {tab === 'saccos' && (
          <button onClick={openCreate} className="flex items-center gap-1 bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
            <Plus className="w-4 h-4" /> Create SACCO
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('saccos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'saccos' ? 'bg-orange-500 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}
        >
          <Building2 className="w-4 h-4" /> SACCOs
        </button>
        <button
          onClick={() => setTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'pending' ? 'bg-orange-500 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}
        >
          <Clock className="w-4 h-4" /> Pending Members
        </button>
      </div>

      {tab === 'pending' ? (
        loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <SaccoPendingMembers saccos={groups} counties={counties} />
        )
      ) : loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No SACCOs created yet</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">County</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Members</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">SasaPay Acct</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{g.name}</p>
                    {g.bank_name && <p className="text-xs text-muted-foreground">{g.bank_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{countyName(g.county_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{g.member_count || 0}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden lg:table-cell">{g.sasapay_account_number || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${g.status === 'active' ? 'bg-success/10 text-success' : g.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{g.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg hover:bg-accent">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(g.id)} disabled={deleting === g.id} className="p-1.5 rounded-lg hover:bg-destructive/10">
                        {deleting === g.id ? <Loader2 className="w-4 h-4 text-destructive animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">{editing ? 'Edit SACCO' : 'Create SACCO'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">SACCO Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Kisumu Bodaboda SACCO" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">County *</label>
                <select value={form.county_id} onChange={e => setForm(f => ({ ...f, county_id: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                  <option value="">Select county</option>
                  {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border">
                <div className="flex items-center gap-2 mb-3"><Banknote className="w-4 h-4 text-orange-500" /><p className="text-sm font-semibold">Bank Details</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Bank Name</label>
                    <select value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                      <option value="">Select bank</option>
                      {KENYAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Account Name</label>
                    <input value={form.bank_account_name} onChange={e => setForm(f => ({ ...f, bank_account_name: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Account Number</label>
                    <input value={form.bank_account_number} onChange={e => setForm(f => ({ ...f, bank_account_number: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Branch</label>
                    <input value={form.bank_branch} onChange={e => setForm(f => ({ ...f, bank_branch: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">M-Pesa Till No.</label>
                    <input value={form.mpesa_till_number} onChange={e => setForm(f => ({ ...f, mpesa_till_number: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">SasaPay Acct No.</label>
                    <input value={form.sasapay_account_number} onChange={e => setForm(f => ({ ...f, sasapay_account_number: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <div className="flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-orange-500" /><p className="text-sm font-semibold">Official Contact</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Official Name</label>
                    <input value={form.official_name} onChange={e => setForm(f => ({ ...f, official_name: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Phone</label>
                    <input value={form.official_phone} onChange={e => setForm(f => ({ ...f, official_phone: e.target.value }))} placeholder="2547XX..." className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Email</label>
                    <input value={form.official_email} onChange={e => setForm(f => ({ ...f, official_email: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 sticky bottom-0 bg-card">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Update SACCO' : 'Create SACCO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
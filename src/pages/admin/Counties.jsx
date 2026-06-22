import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/format';
import { auditLog } from '@/lib/audit';
import { Building2, Plus, Power, ShieldCheck } from 'lucide-react';

export default function AdminCounties() {
  const { toast } = useToast();
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCounty, setNewCounty] = useState({ name: '', code: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const c = await base44.entities.County.filter({});
      setCounties(c);
    } catch (e) {}
    setLoading(false);
  }

  async function addCounty() {
    if (!newCounty.name) return;
    await base44.entities.County.create({ name: newCounty.name, code: newCounty.code, status: 'draft', sasapay_business_kyc_status: 'none' });
    setShowAdd(false);
    setNewCounty({ name: '', code: '' });
    load();
  }

  async function approveBusinessKyc(county) {
    const u = await base44.auth.me();
    await base44.entities.County.update(county.id, { sasapay_business_kyc_status: 'approved' });
    await auditLog({ userId: u.id, action: 'county_business_kyc_approved', entityType: 'County', entityId: county.id, description: `Business KYC approved for ${county.name}` });
    toast({ title: 'Business KYC Approved', description: `${county.name} can now go live.` });
    load();
  }

  async function toggleLive(county) {
    const newStatus = county.status === 'live' ? 'draft' : 'live';
    // Enforce business KYC gate before going LIVE
    if (newStatus === 'live' && county.sasapay_business_kyc_status !== 'approved') {
      toast({ title: 'Cannot Go Live', description: 'Approve the county\'s SasaPay Business KYC first.', variant: 'destructive' });
      return;
    }
    const u = await base44.auth.me();
    await base44.entities.County.update(county.id, { status: newStatus, activated_date: newStatus === 'live' ? new Date().toISOString() : null });
    await auditLog({ userId: u.id, action: 'county_status_changed', entityType: 'County', entityId: county.id, description: `${county.name} status changed to ${newStatus}`, oldValues: { status: county.status }, newValues: { status: newStatus } });
    toast({ title: newStatus === 'live' ? 'County is Live' : 'County Deactivated', description: `${county.name} is now ${newStatus}.` });
    load();
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-heading font-bold">Counties</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage counties</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
          <Plus className="w-4 h-4" /> Add County
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {counties.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center"><Building2 className="w-5 h-5 text-orange-600" /></div>
                  <div><p className="font-heading font-bold text-sm">{c.name}</p><p className="text-xs text-muted-foreground">Code: {c.code || '—'}</p></div>
                </div>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${c.status === 'live' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{c.status}</span>
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                <p>SasaPay KYC: <span className={`font-medium ${c.sasapay_business_kyc_status === 'approved' ? 'text-success' : 'text-warning'}`}>{c.sasapay_business_kyc_status || 'none'}</span></p>
                {c.activated_date && <p>Activated: {formatDate(c.activated_date)}</p>}
              </div>
              <div className="flex gap-2">
                {c.sasapay_business_kyc_status !== 'approved' && (
                  <button onClick={() => approveBusinessKyc(c)} className="flex-1 flex items-center justify-center gap-1 bg-blue-50 text-blue-600 rounded-lg py-2 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Approve KYC
                  </button>
                )}
                <button onClick={() => toggleLive(c)} disabled={c.status !== 'live' && c.sasapay_business_kyc_status !== 'approved'} className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold ${c.status === 'live' ? 'bg-destructive/10 text-destructive' : 'bg-success text-success-foreground'} disabled:opacity-40 disabled:cursor-not-allowed`}>
                  <Power className="w-3.5 h-3.5" /> {c.status === 'live' ? 'Deactivate' : 'Go Live'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-heading font-bold text-lg mb-4">Add County</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">County Name</label><input type="text" value={newCounty.name} onChange={e => setNewCounty(c => ({ ...c, name: e.target.value }))} placeholder="Nairobi" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">County Code</label><input type="text" value={newCounty.code} onChange={e => setNewCounty(c => ({ ...c, code: e.target.value }))} placeholder="47" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={addCounty} className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
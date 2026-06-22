import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDate, formatKES, formatDateTime } from '@/lib/format';
import { Users, FileBarChart, Settings as SettingsIcon, Bell, UserPlus, Plus, Download, Loader2, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export function CountyPeople() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [staffForm, setStaffForm] = useState({ email: '', role: 'county_admin' });
  const [annForm, setAnnForm] = useState({ title: '', body: '', audience: 'all' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [staffUsers, anns] = await Promise.all([
          base44.entities.User.filter({ role: 'county_admin' }),
          base44.entities.Announcement.filter({ status: 'published' }, '-created_date', 20),
        ]);
        setStaff(staffUsers);
        setAnnouncements(anns);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, []);

  async function inviteStaff() {
    if (!staffForm.email) return;
    setSaving(true);
    try {
      await base44.users.inviteUser(staffForm.email, staffForm.role);
      toast({ title: 'Invite sent', description: `${staffForm.email} has been invited.` });
      setShowStaffModal(false);
      setStaffForm({ email: '', role: 'county_admin' });
      const staffUsers = await base44.entities.User.filter({ role: 'county_admin' });
      setStaff(staffUsers);
    } catch (e) {
      toast({ title: 'Failed to invite', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  async function createAnnouncement() {
    if (!annForm.title || !annForm.body) return;
    setSaving(true);
    try {
      await base44.entities.Announcement.create({
        title: annForm.title,
        body: annForm.body,
        audience: annForm.audience,
        county_id: user?.county_id || null,
        status: 'published',
      });
      toast({ title: 'Announcement published' });
      setShowAnnModal(false);
      setAnnForm({ title: '', body: '', audience: 'all' });
      const anns = await base44.entities.Announcement.filter({ status: 'published' }, '-created_date', 20);
      setAnnouncements(anns);
    } catch (e) {
      toast({ title: 'Failed to create', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">People</h1>
      <p className="text-sm text-muted-foreground mb-5">Manage staff and communications</p>
      <div className="grid lg:grid-cols-2 gap-4">
        {/* County Staff */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600" /><h2 className="font-heading font-bold">County Staff</h2></div>
            <button onClick={() => setShowStaffModal(true)} className="flex items-center gap-1 bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">
              <UserPlus className="w-3.5 h-3.5" /> Add Staff
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : staff.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No staff members added</p>
          ) : (
            <div className="space-y-2">
              {staff.map(s => (
                <div key={s.id} className="flex items-center justify-between border-b border-border last:border-0 pb-2 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{s.full_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 capitalize">{(s.role || 'staff').replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Bell className="w-5 h-5 text-emerald-600" /><h2 className="font-heading font-bold">Announcements</h2></div>
            <button onClick={() => setShowAnnModal(true)} className="flex items-center gap-1 bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No announcements published</p>
          ) : (
            <div className="space-y-2">
              {announcements.map(a => (
                <div key={a.id} className="border-b border-border last:border-0 pb-2 last:pb-0">
                  <p className="text-sm font-medium">{a.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 capitalize">{a.audience}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(a.created_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowStaffModal(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-heading font-bold text-lg mb-4">Add Staff Member</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <input type="email" value={staffForm.email} onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} placeholder="name@county.go.ke" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <select value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                  <option value="county_admin">County Admin</option>
                  <option value="field_agent">Field Agent / Enforcement</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowStaffModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={inviteStaff} disabled={!staffForm.email || saving} className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Announcement Modal */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAnnModal(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-heading font-bold text-lg mb-4">New Announcement</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Title</label>
                <input type="text" value={annForm.title} onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))} placeholder="Important update" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Body</label>
                <textarea value={annForm.body} onChange={e => setAnnForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your message..." rows={4} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Audience</label>
                <select value={annForm.audience} onChange={e => setAnnForm(f => ({ ...f, audience: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                  <option value="all">All Users</option>
                  <option value="riders">Riders Only</option>
                  <option value="county_staff">County Staff</option>
                  <option value="sacco_staff">SACCO Staff</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAnnModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={createAnnouncement} disabled={!annForm.title || !annForm.body || saving} className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CountyReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [data, setData] = useState([]);
  const [error, setError] = useState('');

  const countyId = user?.scope_entity_id || user?.county_id;

  const reportConfigs = [
    { id: 'transactions', name: 'Transaction Report', desc: 'County lipa_county transactions', entity: 'Transaction', sort: '-created_date', limit: 200, filter: { type: 'lipa_county' }, countyScoped: true },
    { id: 'settlements', name: 'Settlement Report', desc: 'County settlements', entity: 'Settlement', sort: '-created_date', limit: 200, filter: { entity_type: 'county' }, countyScoped: true },
    { id: 'riders', name: 'Rider Report', desc: 'Registered riders in county', entity: 'User', sort: '-created_date', limit: 200, filter: { staff_type: 'none' }, countyScoped: true },
    { id: 'lipisha', name: 'Lipisha Report', desc: 'Fare collection transactions', entity: 'Transaction', sort: '-created_date', limit: 200, filter: { type: 'lipisha' } },
    { id: 'permits', name: 'Permit Report', desc: 'Permits issued in county', entity: 'Permit', sort: '-created_date', limit: 200, filter: {}, countyScoped: true },
    { id: 'audit', name: 'Audit Log', desc: 'Full audit trail', entity: 'AuditLog', sort: '-created_date', limit: 200, filter: {} },
  ];

  async function runReport(config) {
    setActiveReport(config);
    setLoading(true);
    setError('');
    setData([]);
    try {
      let result = await base44.entities[config.entity].filter(config.filter, config.sort, config.limit);

      // County-scope the results
      if (config.countyScoped && countyId) {
        if (config.id === 'transactions' || config.id === 'lipisha') {
          // Scope by vehicle_id matching county vehicles
          const vehicles = await base44.entities.Vehicle.filter({ county_id: countyId });
          const vehicleIds = new Set(vehicles.map(v => v.id));
          result = result.filter(t => !t.vehicle_id || vehicleIds.has(t.vehicle_id));
        } else if (config.id === 'settlements') {
          result = result.filter(s => !s.entity_id || s.entity_id === countyId);
        } else if (config.id === 'riders') {
          result = result.filter(r => r.county_id === countyId);
        } else if (config.id === 'permits') {
          result = result.filter(p => p.county_id === countyId);
        }
      }

      setData(result);
    } catch (e) {
      setError(e.message || 'Failed to load report data');
    }
    setLoading(false);
  }

  function exportCSV() {
    if (data.length === 0) return;
    const keys = new Set();
    data.forEach(row => Object.keys(row).forEach(k => keys.add(k)));
    const headers = [...keys];
    const csvLines = [headers.join(',')];
    data.forEach(row => {
      const values = headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
      });
      csvLines.push(values.join(','));
    });
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `county_${activeReport.id}_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const renderRow = (row) => {
    if (activeReport.id === 'transactions' || activeReport.id === 'lipisha') {
      return (
        <tr key={row.id} className="border-t border-border hover:bg-accent/50">
          <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(row.created_date)}</td>
          <td className="px-3 py-2 text-xs font-semibold">{row.type}</td>
          <td className="px-3 py-2 text-xs">{formatKES(row.amount_cents)}</td>
          <td className="px-3 py-2 text-xs"><span className={`rounded-full px-2 py-0.5 font-semibold ${row.status === 'completed' ? 'bg-success/10 text-success' : row.status === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>{row.status}</span></td>
          <td className="px-3 py-2 text-xs text-muted-foreground font-mono truncate max-w-[120px]">{row.reference || '—'}</td>
        </tr>
      );
    }
    if (activeReport.id === 'settlements') {
      return (
        <tr key={row.id} className="border-t border-border hover:bg-accent/50">
          <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(row.created_date)}</td>
          <td className="px-3 py-2 text-xs font-semibold capitalize">{row.entity_type}</td>
          <td className="px-3 py-2 text-xs">{formatKES(row.amount_cents)}</td>
          <td className="px-3 py-2 text-xs"><span className={`rounded-full px-2 py-0.5 font-semibold ${row.status === 'processed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{row.status}</span></td>
        </tr>
      );
    }
    if (activeReport.id === 'riders') {
      return (
        <tr key={row.id} className="border-t border-border hover:bg-accent/50">
          <td className="px-3 py-2 text-xs font-medium">{row.full_name || '—'}</td>
          <td className="px-3 py-2 text-xs text-muted-foreground">{row.email}</td>
          <td className="px-3 py-2 text-xs text-muted-foreground">{row.phone || '—'}</td>
          <td className="px-3 py-2 text-xs">{row.national_id || '—'}</td>
          <td className="px-3 py-2 text-xs"><span className="capitalize">{row.kyc_status || 'none'}</span></td>
        </tr>
      );
    }
    if (activeReport.id === 'permits') {
      return (
        <tr key={row.id} className="border-t border-border hover:bg-accent/50">
          <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(row.start_date)}</td>
          <td className="px-3 py-2 text-xs font-semibold capitalize">{row.billing_cycle}</td>
          <td className="px-3 py-2 text-xs">{formatKES(row.amount_paid_cents)}</td>
          <td className="px-3 py-2 text-xs"><span className={`rounded-full px-2 py-0.5 font-semibold ${row.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{row.status}</span></td>
        </tr>
      );
    }
    if (activeReport.id === 'audit') {
      return (
        <tr key={row.id} className="border-t border-border hover:bg-accent/50">
          <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(row.created_date)}</td>
          <td className="px-3 py-2 text-xs font-semibold">{row.action}</td>
          <td className="px-3 py-2 text-xs text-muted-foreground">{row.entity_type || '—'}</td>
          <td className="px-3 py-2 text-xs max-w-[300px] truncate">{row.description || '—'}</td>
        </tr>
      );
    }
    return null;
  };

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Reports</h1>
      <p className="text-sm text-muted-foreground mb-5">Export data scoped to your county</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {reportConfigs.map(r => (
          <button
            key={r.id}
            onClick={() => runReport(r)}
            className={`bg-card border rounded-xl p-4 text-left transition-colors ${activeReport?.id === r.id ? 'border-emerald-600 ring-2 ring-emerald-600/20' : 'border-border hover:bg-accent'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <FileBarChart className={`w-6 h-6 ${activeReport?.id === r.id ? 'text-emerald-600' : 'text-muted-foreground'}`} />
              <Download className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">{r.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
          </button>
        ))}
      </div>

      {activeReport && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="text-sm font-heading font-bold">{activeReport.name}</p>
              <p className="text-xs text-muted-foreground">{data.length} records {loading && '(loading...)'}</p>
            </div>
            {data.length > 0 && !loading && (
              <button onClick={exportCSV} className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-lg px-3 py-2 text-xs font-semibold hover:bg-emerald-700 transition-colors">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            )}
          </div>

          {error ? (
            <p className="text-sm text-destructive text-center py-8">{error}</p>
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    {(activeReport.id === 'transactions' || activeReport.id === 'lipisha') && <>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Type</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Amount</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Reference</th>
                    </>}
                    {activeReport.id === 'settlements' && <>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Entity</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Amount</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Status</th>
                    </>}
                    {activeReport.id === 'riders' && <>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Name</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Email</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Phone</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">National ID</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">KYC</th>
                    </>}
                    {activeReport.id === 'permits' && <>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Start Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Cycle</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Amount</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Status</th>
                    </>}
                    {activeReport.id === 'audit' && <>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Action</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Entity</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Description</th>
                    </>}
                  </tr>
                </thead>
                <tbody>
                  {data.map(renderRow)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CountySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [county, setCounty] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const countyId = user?.scope_entity_id || user?.county_id;

  useEffect(() => {
    async function load() {
      if (!countyId) { setLoading(false); return; }
      try {
        const counties = await base44.entities.County.filter({ id: countyId });
        if (counties[0]) {
          setCounty(counties[0]);
          setForm({
            name: counties[0].name || '',
            code: counties[0].code || '',
            description: counties[0].description || '',
          });
        }
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [countyId]);

  async function handleSave() {
    if (!county) return;
    setSaving(true);
    try {
      await base44.entities.County.update(county.id, {
        name: form.name,
        code: form.code,
        description: form.description,
      });
      toast({ title: 'Settings saved', description: 'County profile updated successfully.' });
    } catch (e) {
      toast({ title: 'Failed to save', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-5">County profile and configuration</p>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : !county ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <SettingsIcon className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No county profile found for your account.</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {/* County Profile */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4"><SettingsIcon className="w-5 h-5 text-emerald-600" /><h2 className="font-heading font-bold">County Profile</h2></div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">County Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="Nairobi" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">County Code</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="47" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none" placeholder="Brief description of the county" />
              </div>
            </div>
          </div>

          {/* Status Info */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4"><SettingsIcon className="w-5 h-5 text-emerald-600" /><h2 className="font-heading font-bold">Status</h2></div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Operational Status</span>
                <span className={`font-semibold rounded-full px-2 py-0.5 ${county.status === 'live' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{county.status}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">SasaPay KYC</span>
                <span className={`font-semibold rounded-full px-2 py-0.5 ${county.sasapay_business_kyc_status === 'approved' ? 'bg-success/10 text-success' : county.sasapay_business_kyc_status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{county.sasapay_business_kyc_status}</span>
              </div>
              {county.activated_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Activated Date</span>
                  <span className="font-medium">{formatDate(county.activated_date)}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDate } from '@/lib/format';
import { Users, FileBarChart, Settings as SettingsIcon, Bell, UserPlus, Plus } from 'lucide-react';
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
  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Reports</h1>
      <p className="text-sm text-muted-foreground mb-5">Export data and view audit trail</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {['Transaction Report', 'Settlement Report', 'Rider Report', 'Lipisha Report', 'Permit Report', 'Audit Log'].map(r => (
          <button key={r} className="bg-card border border-border rounded-xl p-4 text-left hover:bg-accent transition-colors">
            <FileBarChart className="w-6 h-6 text-emerald-600 mb-2" />
            <p className="text-sm font-medium">{r}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Export as CSV</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function CountySettings() {
  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-5">County profile and configuration</p>
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4"><SettingsIcon className="w-5 h-5 text-emerald-600" /><h2 className="font-heading font-bold">County Profile</h2></div>
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground">County Name</label><input className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="Nairobi" /></div>
          <div><label className="text-xs text-muted-foreground">County Code</label><input className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="47" /></div>
        </div>
      </div>
    </div>
  );
}
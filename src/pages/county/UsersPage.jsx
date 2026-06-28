import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/format';
import { Settings2, Plus, Search, Shield, Loader2 } from 'lucide-react';

const STAFF_ROLES = [
  { value: 'county_admin', label: 'County Admin', color: 'bg-orange-50 text-[#ff5a1f]' },
  { value: 'enforcement_officer', label: 'Enforcement Officer', color: 'bg-red-50 text-red-600' },
  { value: 'finance_officer', label: 'Finance Officer', color: 'bg-blue-50 text-blue-600' },
  { value: 'data_clerk', label: 'Data Clerk', color: 'bg-purple-50 text-purple-600' },
];

export default function CountyUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'enforcement_officer' });
  const [inviting, setInviting] = useState(false);

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const all = await base44.entities.User.filter(countyId ? { county_id: countyId } : {}, '-created_date', 100);
      setStaff(all.filter(u => (u.roles || []).some(r => r !== 'rider') || u.staff_type !== 'none'));
    } catch (e) { console.error('County users load error:', e); }
    setLoading(false);
  }

  async function handleInvite() {
    if (!inviteForm.email) return;
    setInviting(true);
    try {
      await base44.auth.inviteUser(inviteForm.email, inviteForm.role);
      toast({ title: 'Invitation sent', description: `${inviteForm.email} has been invited as ${inviteForm.role}` });
      setShowInvite(false);
      setInviteForm({ email: '', role: 'enforcement_officer' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setInviting(false);
  }

  const filtered = staff.filter(s =>
    !search.trim() ||
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (roles) => {
    const staffRole = (roles || []).find(r => r !== 'rider');
    const config = STAFF_ROLES.find(r => r.value === staffRole) || STAFF_ROLES.find(r => r.value === 'county_admin');
    return <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${config.color}`}>{config.label}</span>;
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings2 className="w-6 h-6 text-[#ff5a1f]" />
            <h1 className="text-2xl font-heading font-bold">County Users</h1>
          </div>
          <p className="text-sm text-muted-foreground">Manage county staff accounts and roles</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-1 bg-[#ff5a1f] text-white rounded-lg px-4 py-2 text-sm font-semibold">
          <Plus className="w-4 h-4" /> Invite Staff
        </button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">{s.full_name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.email}</td>
                  <td className="px-4 py-3">{getRoleBadge(s.roles)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{formatDate(s.created_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8">
              <Shield className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No staff members found</p>
            </div>
          )}
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInvite(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-heading font-bold text-lg mb-4">Invite Staff Member</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="staff@county.go.ke"
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
                >
                  {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowInvite(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={handleInvite} disabled={!inviteForm.email || inviting} className="flex-1 bg-[#ff5a1f] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1">
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
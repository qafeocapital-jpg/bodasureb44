import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDate } from '@/lib/format';
import { Users, UserPlus, Loader2, AlertCircle, X, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ROLE_OPTIONS = [
  { value: 'rider', label: 'Rider' },
  { value: 'county_admin', label: 'County Admin' },
  { value: 'sacco_admin', label: 'SACCO Admin' },
  { value: 'merchant_admin', label: 'Merchant Admin' },
  { value: 'field_agent', label: 'Field Agent' },
  { value: 'stage_admin', label: 'Stage Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

// Roles that require scope_entity_id
const SCOPED_ROLES = ['county_admin', 'sacco_admin', 'merchant_admin', 'field_agent', 'stage_admin'];

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('rider');
  const [inviteScope, setInviteScope] = useState('');
  const [inviting, setInviting] = useState(false);
  const [changingRole, setChangingRole] = useState(null);
  const [scopeEntities, setScopeEntities] = useState({ counties: [], saccos: [], stages: [], merchants: [] });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [u, counties, saccos, stages, merchants] = await Promise.all([
        base44.entities.User.filter({}),
        base44.entities.County.filter({}),
        base44.entities.Group.filter({ type: 'sacco' }, '-created_date', 100),
        base44.entities.Stage.filter({}, '-created_date', 100),
        base44.entities.Group.filter({ type: 'other' }, '-created_date', 50),
      ]);
      setUsers(u);
      setScopeEntities({ counties, saccos, stages, merchants });
    } catch (e) {}
    setLoading(false);
  }

  async function handleInvite() {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole === 'super_admin' ? 'admin' : 'user');
      // Set role + scope after invite
      const newUsers = await base44.entities.User.filter({ email: inviteEmail });
      if (newUsers.length > 0) {
        const updateData = {
          role: inviteRole,
          staff_type: inviteRole === 'rider' ? 'none' : inviteRole,
        };
        if (SCOPED_ROLES.includes(inviteRole) && inviteScope) {
          updateData.scope_entity_id = inviteScope;
          if (inviteRole === 'county_admin' || inviteRole === 'field_agent') {
            updateData.county_id = inviteScope;
          }
        }
        await base44.entities.User.update(newUsers[0].id, updateData);
      }
      toast({ title: 'Invite sent', description: `${inviteEmail} has been invited as ${inviteRole}.` });
      setShowInvite(false);
      setInviteEmail('');
      setInviteRole('rider');
      setInviteScope('');
      load();
    } catch (e) {
      toast({ title: 'Failed to invite', description: e.message, variant: 'destructive' });
    }
    setInviting(false);
  }

  async function handleRoleChange(userId, newRole) {
    setChangingRole(userId);
    try {
      const updateData = { role: newRole, staff_type: newRole === 'rider' ? 'none' : newRole };
      // If switching to a non-scoped role, clear scope
      if (!SCOPED_ROLES.includes(newRole)) {
        updateData.scope_entity_id = '';
      }
      await base44.entities.User.update(userId, updateData);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updateData } : u));
      toast({ title: 'Role updated' });
    } catch (e) {
      toast({ title: 'Failed to update role', description: e.message, variant: 'destructive' });
    }
    setChangingRole(null);
  }

  async function handleScopeChange(userId, scopeEntityId, role) {
    try {
      const updateData = { scope_entity_id: scopeEntityId };
      if ((role === 'county_admin' || role === 'field_agent') && scopeEntityId) {
        updateData.county_id = scopeEntityId;
      }
      await base44.entities.User.update(userId, updateData);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updateData } : u));
      toast({ title: 'Scope assigned' });
    } catch (e) {
      toast({ title: 'Failed to assign scope', description: e.message, variant: 'destructive' });
    }
  }

  function getScopeOptions(role) {
    if (role === 'county_admin' || role === 'field_agent') return scopeEntities.counties.map(c => ({ value: c.id, label: c.name }));
    if (role === 'sacco_admin') return scopeEntities.saccos.map(s => ({ value: s.id, label: s.name }));
    if (role === 'stage_admin') return scopeEntities.stages.map(s => ({ value: s.id, label: s.name }));
    if (role === 'merchant_admin') return scopeEntities.merchants.map(m => ({ value: m.id, label: m.name }));
    return [];
  }

  function getScopeLabel(role) {
    if (role === 'county_admin' || role === 'field_agent') return 'County';
    if (role === 'sacco_admin') return 'SACCO';
    if (role === 'stage_admin') return 'Stage';
    if (role === 'merchant_admin') return 'Merchant';
    return '';
  }

  const inviteScopeOptions = getScopeOptions(inviteRole);

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-heading font-bold">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage staff accounts, roles, and scope assignments</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-1 bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
          <UserPlus className="w-4 h-4" /> Invite Staff
        </button>
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scope</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const needsScope = SCOPED_ROLES.includes(u.role) && !u.scope_entity_id;
                const scopeOptions = getScopeOptions(u.role);
                return (
                  <tr key={u.id} className="border-t border-border hover:bg-accent/50">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-1">
                        {u.full_name || '—'}
                        {u.id === currentUser?.id && <span className="text-xs text-muted-foreground">(You)</span>}
                        {needsScope && (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-destructive bg-destructive/10 rounded-full px-1.5 py-0.5" title="No scope assigned">
                            <AlertCircle className="w-3 h-3" /> No scope
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role || 'rider'}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        disabled={changingRole === u.id}
                        className="text-xs font-semibold rounded-lg border border-input bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      {changingRole === u.id && <Loader2 className="inline-block w-3 h-3 ml-1 animate-spin text-muted-foreground" />}
                    </td>
                    <td className="px-4 py-3">
                      {SCOPED_ROLES.includes(u.role) ? (
                        <select
                          value={u.scope_entity_id || ''}
                          onChange={e => handleScopeChange(u.id, e.target.value, u.role)}
                          className="text-xs rounded-lg border border-input bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">— No {getScopeLabel(u.role)} —</option>
                          {scopeOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{formatDate(u.created_date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No users found</p>}
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInvite(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">Invite Staff Member</h3>
              <button onClick={() => setShowInvite(false)} className="p-1 rounded-lg hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="staff@bodasure.com" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <select value={inviteRole} onChange={e => { setInviteRole(e.target.value); setInviteScope(''); }} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {SCOPED_ROLES.includes(inviteRole) && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" /> {getScopeLabel(inviteRole)} Assignment
                  </label>
                  <select value={inviteScope} onChange={e => setInviteScope(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                    <option value="">— Select {getScopeLabel(inviteRole)} —</option>
                    {inviteScopeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {!inviteScope && (
                    <p className="text-[10px] text-warning mt-1">⚠ This role requires scope assignment to function properly</p>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowInvite(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={handleInvite} disabled={inviting} className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                  {inviting ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
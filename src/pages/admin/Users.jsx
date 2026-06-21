import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import { Users, UserPlus } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const u = await base44.entities.User.list();
      setUsers(u);
    } catch (e) {}
    setLoading(false);
  }

  async function handleInvite() {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      setShowInvite(false);
      setInviteEmail('');
      load();
    } catch (e) {}
    setInviting(false);
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-heading font-bold">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage staff accounts and roles</p>
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">{u.full_name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3"><span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-primary/10 text-primary capitalize">{u.role || 'user'}</span></td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(u.created_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No users found</p>}
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInvite(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-heading font-bold text-lg mb-4">Invite Staff Member</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">Email Address</label><input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="staff@bodasure.com" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Role</label><select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"><option value="user">User</option><option value="admin">Admin</option></select></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowInvite(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={handleInvite} disabled={inviting} className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">{inviting ? 'Inviting...' : 'Send Invite'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
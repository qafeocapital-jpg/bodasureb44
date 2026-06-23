import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import { Users, UserPlus, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { formatPhoneDisplay } from '@/lib/phone';
import { useToast } from '@/components/ui/use-toast';
import VerificationBadge from '@/components/admin/VerificationBadge';
import VerificationDetailSheet from '@/components/admin/VerificationDetailSheet';

export default function SaccoMembers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);
  const [verifyRiderId, setVerifyRiderId] = useState(null);

  const groupId = user?.scope_entity_id;

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        // Scope to the SACCO's own group, not county
        if (groupId) {
          const groupMembers = await base44.entities.GroupMember.filter({ group_id: groupId }, '-created_date', 100);
          // Batch fetch user details to avoid N+1
          const riderIds = [...new Set(groupMembers.map(gm => gm.user_id).filter(Boolean))];
          let riderMap = {};
          if (riderIds.length > 0) {
            const allUsers = await Promise.all(riderIds.map(id => base44.entities.User.get(id).catch(() => null)));
            allUsers.filter(Boolean).forEach(u => { riderMap[u.id] = u; });
          }
          const memberUsers = groupMembers.map(gm => ({ ...gm, user: riderMap[gm.user_id] || null }));
          setMembers(memberUsers);
        } else {
          setMembers([]);
        }
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  async function handleApprove(memberId) {
    setActioning(memberId);
    try {
      await base44.entities.GroupMember.update(memberId, {
        status: 'approved',
        joined_date: new Date().toISOString(),
      });
      toast({ title: 'Member approved' });
      // Update local state instead of refetching everything
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'approved', joined_date: new Date().toISOString() } : m));
    } catch (e) {
      toast({ title: 'Failed to approve', description: e.message, variant: 'destructive' });
    }
    setActioning(null);
  }

  async function handleReject(memberId) {
    setActioning(memberId);
    try {
      await base44.entities.GroupMember.update(memberId, { status: 'rejected' });
      toast({ title: 'Member rejected' });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'rejected' } : m));
    } catch (e) {
      toast({ title: 'Failed to reject', description: e.message, variant: 'destructive' });
    }
    setActioning(null);
  }

  const pendingCount = members.filter(m => m.status === 'pending').length;

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Members</h1>
      <p className="text-sm text-muted-foreground mb-5">Manage SACCO members {pendingCount > 0 && `· ${pendingCount} pending approval`}</p>
      <div className="flex justify-end mb-3">
        <button className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold">
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Role</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Verification</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} className="border-t border-border hover:bg-accent/50">
                <td className="px-4 py-3 font-medium">{m.user?.full_name || 'Unknown'}</td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{m.user?.phone ? formatPhoneDisplay(m.user.phone) : m.user?.email || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell capitalize">{m.role || 'member'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                    m.status === 'approved' ? 'bg-success/10 text-success'
                    : m.status === 'pending' ? 'bg-warning/10 text-warning'
                    : 'bg-destructive/10 text-destructive'
                  }`}>{m.status}</span>
                </td>
                <td className="px-4 py-3">
                  {m.user && <VerificationBadge user={m.user} onClick={() => setVerifyRiderId(m.user.id)} />}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{m.joined_date ? formatDate(m.joined_date) : '—'}</td>
                <td className="px-4 py-3 text-right">
                  {m.status === 'pending' && (
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => handleApprove(m.id)}
                        disabled={actioning === m.id}
                        className="flex items-center gap-1 bg-success/10 text-success rounded-lg px-2 py-1 text-xs font-semibold hover:bg-success/20 disabled:opacity-50"
                      >
                        {actioning === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(m.id)}
                        disabled={actioning === m.id}
                        className="flex items-center gap-1 bg-destructive/10 text-destructive rounded-lg px-2 py-1 text-xs font-semibold hover:bg-destructive/20 disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No members yet</p>}
      </div>

      {verifyRiderId && (
        <VerificationDetailSheet riderId={verifyRiderId} onClose={() => setVerifyRiderId(null)} canApprove={false} />
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Check, X, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/format';

export default function GroupMemberManagement({ group }) {
  const { toast } = useToast();
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [riders, setRiders] = useState({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => { load(); }, [group?.id]);

  async function load() {
    if (!group?.id) return;
    setLoading(true);
    try {
      const [pendingMembers, approvedMembers] = await Promise.all([
        base44.entities.GroupMember.filter({ group_id: group.id, status: 'pending' }),
        base44.entities.GroupMember.filter({ group_id: group.id, status: 'approved' }),
      ]);
      setPending(pendingMembers);
      setApproved(approvedMembers);

      const allIds = [...new Set([...pendingMembers, ...approvedMembers].map(m => m.user_id))];
      if (allIds.length > 0) {
        const riderData = await Promise.all(allIds.map(id => base44.entities.User.get(id).catch(() => null)));
        const map = {};
        riderData.filter(Boolean).forEach(u => { map[u.id] = u; });
        setRiders(map);
      }
    } catch (e) {}
    setLoading(false);
  }

  async function approve(memberId) {
    setActing(memberId);
    try {
      await base44.entities.GroupMember.update(memberId, {
        status: 'approved',
        joined_date: new Date().toISOString(),
      });
      // Increment member count (fetch fresh to avoid stale count on batch approvals)
      const freshGroup = await base44.entities.Group.get(group.id);
      await base44.entities.Group.update(group.id, { member_count: (freshGroup.member_count || 0) + 1 });
      toast({ title: 'Member approved' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setActing(null);
  }

  async function reject(memberId) {
    setActing(memberId);
    try {
      await base44.entities.GroupMember.update(memberId, { status: 'rejected' });
      toast({ title: 'Member rejected' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setActing(null);
  }

  if (loading) return <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Pending Requests */}
      {pending.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Pending Requests ({pending.length})
          </h4>
          <div className="space-y-2">
            {pending.map(m => (
              <div key={m.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div>
                  <p className="text-sm font-medium">{riders[m.user_id]?.full_name || 'Unknown Rider'}</p>
                  <p className="text-[10px] text-muted-foreground">Requested: {formatDate(m.created_date)}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => approve(m.id)} disabled={acting === m.id} className="flex items-center gap-1 bg-success text-white rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                    {acting === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Approve
                  </button>
                  <button onClick={() => reject(m.id)} disabled={acting === m.id} className="flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Members */}
      <div>
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> Members ({approved.length})
        </h4>
        {approved.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No approved members yet.</p>
        ) : (
          <div className="space-y-1">
            {approved.slice(0, 10).map(m => (
              <div key={m.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-xs">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                  {(riders[m.user_id]?.full_name || 'U')[0].toUpperCase()}
                </div>
                <span className="flex-1 font-medium">{riders[m.user_id]?.full_name || 'Unknown Rider'}</span>
                <span className="text-muted-foreground capitalize">{m.role}</span>
              </div>
            ))}
            {approved.length > 10 && <p className="text-[10px] text-muted-foreground text-center py-1">+{approved.length - 10} more</p>}
          </div>
        )}
      </div>
    </div>
  );
}
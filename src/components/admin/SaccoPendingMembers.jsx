import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import { formatPhoneDisplay } from '@/lib/phone';
import { Check, X, Loader2, UserCheck, Clock, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function SaccoPendingMembers({ saccos, counties }) {
  const { toast } = useToast();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);

  useEffect(() => { load(); }, [saccos]);

  async function load() {
    setLoading(true);
    try {
      const pendingMembers = await base44.entities.GroupMember.filter({ status: 'pending' }, '-created_date', 100);
      // Enrich with user + sacco data
      const enriched = await Promise.all(
        pendingMembers.map(async (gm) => {
          const [users, sacco] = await Promise.all([
            base44.entities.User.filter({ id: gm.user_id }),
            Promise.resolve(saccos.find(s => s.id === gm.group_id) || null),
          ]);
          // Fetch stage info if user has one
          let stage = null;
          if (users[0]?.stage_id) {
            const stages = await base44.entities.Stage.filter({ id: users[0].stage_id });
            if (stages[0]) stage = stages[0];
          }
          return { ...gm, user: users[0] || null, sacco, stage };
        })
      );
      setPending(enriched);
    } catch (e) {}
    setLoading(false);
  }

  async function handleApprove(memberId) {
    setActioning(memberId);
    try {
      await base44.entities.GroupMember.update(memberId, {
        status: 'approved',
        joined_date: new Date().toISOString(),
      });
      toast({ title: 'Member approved' });
      setPending(prev => prev.filter(m => m.id !== memberId));
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
      setPending(prev => prev.filter(m => m.id !== memberId));
    } catch (e) {
      toast({ title: 'Failed to reject', description: e.message, variant: 'destructive' });
    }
    setActioning(null);
  }

  const countyName = (id) => counties.find(c => c.id === id)?.name || '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <UserCheck className="w-10 h-10 mx-auto text-success mb-2" />
        <p className="text-sm text-muted-foreground">No pending membership applications</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Applicant</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">SACCO</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">County</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Stage</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Applied</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {pending.map(m => (
            <tr key={m.id} className="border-t border-border hover:bg-accent/50">
              <td className="px-4 py-3">
                <p className="font-medium">{m.user?.full_name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">{m.user?.phone ? formatPhoneDisplay(m.user.phone) : m.user?.email || '—'}</p>
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{m.sacco?.name || '—'}</td>
              <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{countyName(m.user?.county_id)}</td>
              <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                {m.stage ? (
                  <span className="flex items-center gap-1 text-xs">
                    <MapPin className="w-3 h-3" /> {m.stage.name}
                  </span>
                ) : '—'}
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(m.created_date)}</td>
              <td className="px-4 py-3 text-right">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ChevronLeft, Users, UserPlus, PiggyBank, Loader2, CheckCircle2, Layers, Clock, ShieldCheck, ChevronRight } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';
import GroupDetailSheet from '@/components/groups/GroupDetailSheet';
import { useToast } from '@/components/ui/use-toast';

const STATE_BADGES = {
  BASIC_ACTIVE: { label: 'Live', class: 'bg-green-100 text-green-700' },
  KYB_PENDING: { label: 'KYB Pending', class: 'bg-amber-100 text-amber-700' },
  KYB_REVIEW: { label: 'Under Review', class: 'bg-amber-100 text-amber-700' },
  VERIFIED: { label: 'Verified', class: 'bg-blue-100 text-blue-700' },
  SUSPENDED: { label: 'Suspended', class: 'bg-red-100 text-red-700' },
};

export default function Groups() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState([]);
  const [myMemberships, setMyMemberships] = useState([]);
  const [officialGroups, setOfficialGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const [detailGroupId, setDetailGroupId] = useState(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const [allGroups, memberships, myOfficials] = await Promise.all([
          base44.entities.Group.filter({ county_id: user.county_id, status: 'active' }),
          base44.entities.GroupMember.filter({ user_id: user.id }),
          base44.entities.GroupOfficial.filter({ user_id: user.id }),
        ]);

        setMyMemberships(memberships);
        setOfficialGroups(myOfficials.filter(o => o.status === 'active').map(o => o.group_id));
        setGroups(allGroups);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  const myGroupIds = new Set([...myMemberships.filter(m => m.status === 'approved').map(m => m.group_id), ...officialGroups]);
  const pendingGroupIds = new Set(myMemberships.filter(m => m.status === 'pending').map(m => m.group_id));

  const myGroups = groups.filter(g => myGroupIds.has(g.id));

  async function handleJoin(group) {
    setJoining(group.id);
    try {
      const status = group.join_policy === 'auto_approve' ? 'approved' : 'pending';
      await base44.entities.GroupMember.create({
        group_id: group.id,
        user_id: user.id,
        role: 'member',
        status,
        joined_date: status === 'approved' ? new Date().toISOString() : null,
      });
      toast({
        title: status === 'approved' ? 'Joined!' : 'Request sent',
        description: status === 'approved' ? `You've joined ${group.name}.` : `Your request to join ${group.name} is under review.`,
      });
      // Reload memberships
      const memberships = await base44.entities.GroupMember.filter({ user_id: user.id });
      setMyMemberships(memberships);
    } catch (e) {
      toast({ title: 'Failed to join', description: e.message, variant: 'destructive' });
    }
    setJoining(null);
  }

  if (loading) return <PageSkeleton variant="hero-rows" />;

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">Groups</h1>
      </div>

      {/* Register CTA */}
      <button
        onClick={() => navigate('/app/groups/register-sacco')}
        className="w-full flex items-center gap-3 bg-gradient-to-r from-primary to-orange-600 text-white rounded-2xl p-4 mb-5 hover:opacity-90 transition-opacity"
      >
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Layers className="w-5 h-5" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold">Find or Register My Group</p>
          <p className="text-xs opacity-90">Search for your group or create a new one — goes live instantly</p>
        </div>
      </button>

      {/* My Groups */}
      <h2 className="text-sm font-heading font-bold mb-3">My Groups</h2>
      {myGroups.length === 0 ? (
        <div className="bg-accent rounded-2xl p-6 text-center mb-5">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">You haven't joined any groups yet.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {myGroups.map(g => {
            const isOfficial = officialGroups.includes(g.id);
            const state = g.group_state || 'BASIC_ACTIVE';
            const badge = STATE_BADGES[state] || STATE_BADGES.BASIC_ACTIVE;
            return (
              <div key={g.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3" onClick={() => setDetailGroupId(g.id)} role="button">
                    <div className="!w-10 !h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-sm">{g.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${badge.class}`}>{badge.label}</span>
                        {isOfficial && <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">Official</span>}
                        <span className="text-[10px] text-muted-foreground capitalize">{g.type}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {isOfficial && state !== 'VERIFIED' && (
                    <button
                      onClick={() => setDetailGroupId(g.id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl py-2.5 text-xs font-semibold hover:bg-amber-100"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Verify Group
                    </button>
                  )}
                  {isOfficial && state === 'VERIFIED' && (
                    <button
                      onClick={() => setDetailGroupId(g.id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-primary/10 text-primary rounded-xl py-2.5 text-xs font-semibold"
                    >
                      <ChevronRight className="w-3.5 h-3.5" /> Manage
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/app/chama', { state: { groupId: g.id } })}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary/10 text-primary rounded-xl py-2.5 text-xs font-semibold hover:bg-primary/20 transition-colors"
                  >
                    <PiggyBank className="w-3.5 h-3.5" /> Open Chama
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Available Groups */}
      <h2 className="text-sm font-heading font-bold mb-3">Available Groups in Your County</h2>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No groups available in your county yet.</p>
      ) : (
        <div className="space-y-2">
          {groups.filter(g => !myGroupIds.has(g.id)).map(g => {
            const state = g.group_state || 'BASIC_ACTIVE';
            const badge = STATE_BADGES[state] || STATE_BADGES.BASIC_ACTIVE;
            const isPending = pendingGroupIds.has(g.id);
            return (
              <div key={g.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{g.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${badge.class}`}>{badge.label}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{g.type} · {g.member_count || 0} members</span>
                    </div>
                  </div>
                </div>
                {isPending ? (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold bg-amber-50 rounded-full px-3 py-1.5">
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                ) : (
                  <button
                    onClick={() => handleJoin(g)}
                    disabled={joining === g.id}
                    className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1.5 disabled:opacity-50"
                  >
                    {joining === g.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} Join
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {detailGroupId && (
        <GroupDetailSheet groupId={detailGroupId} onClose={() => setDetailGroupId(null)} />
      )}
    </div>
  );
}
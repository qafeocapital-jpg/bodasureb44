import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ChevronLeft, Users, UserPlus, PiggyBank, Loader2, CheckCircle2, Layers, Clock, XCircle } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';

export default function Groups() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [pendingApplication, setPendingApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const [allGroups, myMemberships, ownedBikes] = await Promise.all([
          base44.entities.Group.filter({ county_id: user.county_id, status: 'active' }),
          base44.entities.GroupMember.filter({ user_id: user.id, status: 'approved' }),
          base44.entities.Vehicle.filter({ owner_id: user.id }).catch(() => []),
        ]);

        // Resolve my groups from memberships
        const myGroupIds = new Set(myMemberships.map(m => m.group_id));
        const mine = allGroups.filter(g => myGroupIds.has(g.id));
        setMyGroups(mine);
        setGroups(allGroups);

        // Check for pending SACCO application
        if (user.pending_group_id) {
          const pending = await base44.entities.Group.get(user.pending_group_id).catch(() => null);
          if (pending && pending.status === 'pending') setPendingApplication(pending);
        }
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) return <PageSkeleton variant="hero-rows" />;

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">Groups</h1>
      </div>

      {/* Pending Application Banner */}
      {pendingApplication && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900">Application Under Review</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Your registration for <span className="font-semibold">{pendingApplication.name}</span> is pending Super Admin approval.
              </p>
              {pendingApplication.group_rejection_reason && (
                <p className="text-xs text-red-600 mt-1">Rejected: {pendingApplication.group_rejection_reason}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Register SACCO CTA */}
      {!pendingApplication && (
        <button
          onClick={() => navigate('/app/groups/register-sacco')}
          className="w-full flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-4 mb-5 hover:opacity-90 transition-opacity"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold">Register My SACCO / Group</p>
            <p className="text-xs text-blue-100">Self-register your group for admin review</p>
          </div>
        </button>
      )}

      {/* My Groups */}
      <h2 className="text-sm font-heading font-bold mb-3">My Groups</h2>
      {myGroups.length === 0 ? (
        <div className="bg-accent rounded-2xl p-6 text-center mb-5">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">You haven't joined any groups yet.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {myGroups.map(g => (
            <div key={g.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="!w-10 !h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-heading font-bold text-sm">{g.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{g.type}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-success bg-success/10 rounded-full px-2.5 py-1">Member</span>
              </div>
              <button
                onClick={() => navigate('/app/chama', { state: { groupId: g.id } })}
                className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/20 transition-colors"
              >
                <PiggyBank className="w-4 h-4" /> Open Chama
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Available SACCOs */}
      <h2 className="text-sm font-heading font-bold mb-3">Available Groups in Your County</h2>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No groups available in your county yet.</p>
      ) : (
        <div className="space-y-2">
          {groups.map(g => (
            <div key={g.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{g.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{g.type} · {g.member_count || 0} members</p>
                </div>
              </div>
              {myGroups.find(mg => mg.id === g.id) ? (
                <span className="text-xs text-success font-semibold">Joined</span>
              ) : (
                <button className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Join
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
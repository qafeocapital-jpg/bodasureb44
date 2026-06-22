import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, Loader2, Users, UserPlus, CheckCircle2 } from 'lucide-react';

export default function PhaseSacco({ user, groupMembers, onJoined, onBack }) {
  const [saccos, setSaccos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const [joinedId, setJoinedId] = useState(null);

  const joinedGroupIds = new Set((groupMembers || []).map(m => m.group_id));

  useEffect(() => {
    async function load() {
      if (!user?.county_id) { setLoading(false); return; }
      try {
        const groups = await base44.entities.Group.filter({
          county_id: user.county_id,
          type: 'sacco',
          status: 'active',
        });
        setSaccos(groups);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  async function handleJoin(sacco) {
    setJoining(sacco.id);
    try {
      await base44.entities.GroupMember.create({
        group_id: sacco.id,
        user_id: user.id,
        role: 'member',
        status: 'pending',
        joined_date: new Date().toISOString(),
      });
      setJoinedId(sacco.id);
      setTimeout(() => onJoined(), 800);
    } catch (e) {}
    setJoining(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Join a SACCO in your county to access group benefits and welfare.</p>

      {saccos.length === 0 ? (
        <div className="bg-accent rounded-2xl p-6 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No SACCOs available in your county yet. You can skip this and join later.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {saccos.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground">{s.member_count || 0} members</p>
                </div>
              </div>
              {joinedId === s.id || joinedGroupIds.has(s.id) ? (
                <span className="flex items-center gap-1 text-xs text-success font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Joined
                </span>
              ) : (
                <button
                  onClick={() => handleJoin(s)}
                  disabled={joining !== null}
                  className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1.5 disabled:opacity-50"
                >
                  {joining === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><UserPlus className="w-3.5 h-3.5" /> Join</>}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onJoined}
        className="w-full text-center text-sm text-muted-foreground py-2 font-medium"
      >
        Skip for now
      </button>

      <div className="flex gap-2 pt-2">
        <button onClick={onBack} className="flex items-center justify-center px-5 py-3 rounded-xl border border-border text-sm font-semibold">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
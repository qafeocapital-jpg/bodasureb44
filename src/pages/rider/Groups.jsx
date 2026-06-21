import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES, formatDate } from '@/lib/format';
import { mockPayment, getOrCreateWallet } from '@/lib/mockPayments';
import { ChevronLeft, Users, UserPlus, PiggyBank, BarChart3, Loader2, CheckCircle2 } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';

export default function Groups() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState('sacco');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const allGroups = await base44.entities.Group.filter({ county_id: user.county_id, status: 'active' });
        setGroups(allGroups);
        setMyGroups(allGroups.slice(0, 1));
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  async function handleCreate() {
    if (!newGroupName || !user?.county_id) return;
    setCreating(true);
    try {
      const group = await base44.entities.Group.create({
        name: newGroupName,
        type: newGroupType,
        county_id: user.county_id,
        status: 'active',
        member_count: 1,
        sasapay_account_number: `mock_group_${Date.now()}`,
      });
      // Create a business wallet for the group
      const wallet = await base44.entities.Wallet.create({
        group_id: group.id,
        entity_type: 'business',
        tier: 1,
        status: 'active',
      });
      await base44.entities.WalletSnapshot.create({
        wallet_id: wallet.id,
        balance_cents: 0,
        currency: 'KES',
        last_synced_at: new Date().toISOString(),
      });
      setMyGroups(prev => [...prev, group]);
      setGroups(prev => [...prev, group]);
      setNewGroupName('');
      setShowCreate(false);
    } catch (e) {}
    setCreating(false);
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
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
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

      {/* Create Group */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-[512px] bg-card rounded-t-3xl p-6 pb-8 animate-slide-up">
            <h3 className="font-heading font-bold text-lg mb-4">Create New Group</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="My SACCO"
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Group Type</label>
                <select
                  value={newGroupType}
                  onChange={e => setNewGroupType(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="sacco">SACCO</option>
                  <option value="chama">Chama</option>
                  <option value="welfare">Welfare</option>
                  <option value="self_help">Self Help</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-3 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={handleCreate} disabled={creating || !newGroupName} className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Create</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowCreate(true)}
        className="w-full mt-5 flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-3 text-sm font-semibold text-primary hover:bg-accent transition-colors"
      >
        <UserPlus className="w-4 h-4" /> Create Group
      </button>
    </div>
  );
}
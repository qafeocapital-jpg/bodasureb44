import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Search, Building2, MapPin, Users, Loader2, ChevronRight, AlertCircle, CheckCircle2, UserCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function GroupSearchClaim({ onClaim, onJoinRequest, onCreateNew }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [claiming, setClaiming] = useState(null);
  const [selectedRole, setSelectedRole] = useState({});
  const countyId = user?.county_id;

  const OFFICIAL_ROLES = [
    { value: 'chairperson', label: 'Chairperson' },
    { value: 'secretary', label: 'Secretary' },
    { value: 'treasurer', label: 'Treasurer' },
    { value: 'committee_member', label: 'Committee Member' },
  ];

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(() => doSearch(), 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function doSearch() {
    setLoading(true);
    setSearched(true);
    try {
      const filter = countyId ? { county_id: countyId } : {};
      const all = await base44.entities.Group.filter(filter, '-created_date', 50);
      const q = query.trim().toLowerCase();
      const matched = all.filter(g =>
        g.name?.toLowerCase().includes(q) ||
 g.type?.toLowerCase().includes(q)
      );
      // Enrich with official status
      const enriched = await Promise.all(matched.map(async g => {
        const officials = await base44.entities.GroupOfficial.filter({ group_id: g.id, status: 'active' }).catch(() => []);
        return { ...g, _officialCount: officials.length, _hasOfficials: officials.length > 0 };
      }));
      setResults(enriched);
    } catch (e) {
      console.error('Search error:', e);
    }
    setLoading(false);
  }

  async function handleClaim(group) {
    const role = selectedRole[group.id] || 'chairperson';
    setClaiming(group.id);
    try {
      // Check if already has an active official
      if (group._hasOfficials) {
        // Already claimed — create a pending official + governance dispute
        await base44.entities.GroupOfficial.create({
          group_id: group.id,
          user_id: user.id,
          role,
          status: 'pending',
          kyc_complete: user.account_state === 'VERIFIED' || user.verification_complete === true,
          invited_by_user_id: user.id,
        });
        await base44.functions.invoke('transitionGroupState', {
          groupId: group.id,
          event: 'governance_dispute',
          metadata: { description: `User ${user.full_name} requested to join committee as ${role} — group already has active officials`, challenger_user_id: user.id },
        });
        onJoinRequest(group);
      } else {
        // Unclaimed — claim it
        await base44.entities.GroupOfficial.create({
          group_id: group.id,
          user_id: user.id,
          role,
          status: 'active',
          kyc_complete: user.account_state === 'VERIFIED' || user.verification_complete === true,
          invited_by_user_id: user.id,
          confirmed_at: new Date().toISOString(),
        });
        await base44.functions.invoke('transitionGroupState', {
          groupId: group.id,
          event: 'group_basic_created',
          metadata: { description: `Group claimed by ${user.full_name} as ${role}` },
        });
        onClaim(group, role);
      }
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setClaiming(null);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center mb-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Search className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-base font-heading font-bold">Find Your Group</h2>
        <p className="text-xs text-muted-foreground mt-1">Search for your SACCO or group in {countyId ? 'your county' : 'the system'}. If it exists, claim it or request to join.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search group name..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="bg-accent rounded-2xl p-6 text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium mb-1">No groups found matching "{query}"</p>
          <p className="text-xs text-muted-foreground mb-4">You can create a new group instead.</p>
          <button onClick={onCreateNew} className="inline-flex items-center gap-1 bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold">
            Create New Group <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map(g => (
            <div key={g.id} className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{g.type} · {g.member_count || 0} members</p>
                </div>
                {g._hasOfficials ? (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Claimed
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                    Unclaimed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedRole[g.id] || 'chairperson'}
                  onChange={e => setSelectedRole(s => ({ ...s, [g.id]: e.target.value }))}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-input bg-background text-xs"
                >
                  {OFFICIAL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <button
                  onClick={() => handleClaim(g)}
                  disabled={claiming === g.id}
                  className="flex items-center gap-1 bg-primary text-white rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {claiming === g.id ? <Loader2 className="w-3 h-3 animate-spin" /> : g._hasOfficials ? <UserCheck className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  {g._hasOfficials ? 'Request to Join' : 'Claim'}
                </button>
              </div>
            </div>
          ))}

          <button onClick={onCreateNew} className="w-full text-center text-xs text-primary font-medium py-2 hover:underline">
            Can't find your group? Create a new one →
          </button>
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-6">
          <p className="text-xs text-muted-foreground">Start typing to search, or create a new group.</p>
          <button onClick={onCreateNew} className="mt-3 text-xs text-primary font-semibold hover:underline">
            Create New Group →
          </button>
        </div>
      )}
    </div>
  );
}
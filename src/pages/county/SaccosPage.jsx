import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Building2, Search, Users, CheckCircle2 } from 'lucide-react';

export default function CountySaccos() {
  const { user } = useAuth();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [saccos, setSaccos] = useState([]);
  const [memberCounts, setMemberCounts] = useState({});
  const [officials, setOfficials] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const groups = await base44.entities.Group.filter(countyId ? { county_id: countyId, type: 'sacco' } : { type: 'sacco' });
      setSaccos(groups);

      const counts = {};
      const officialsMap = {};
      await Promise.all(groups.map(async g => {
        const members = await base44.entities.GroupMember.filter({ group_id: g.id, status: 'approved' });
        counts[g.id] = members.length;
        const officialMembers = members.filter(m => ['chairperson', 'treasurer', 'secretary'].includes(m.role));
        const officialUsers = await Promise.all(officialMembers.map(m => base44.entities.User.get(m.user_id).catch(() => null)));
        officialsMap[g.id] = officialUsers.filter(Boolean).map((u, i) => ({ ...u, role: officialMembers[i].role }));
      }));
      setMemberCounts(counts);
      setOfficials(officialsMap);
    } catch (e) { console.error('SACCOs load error:', e); }
    setLoading(false);
  }

  const filtered = search.trim()
    ? saccos.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()))
    : saccos;

  const activeCount = saccos.filter(s => s.status === 'active').length;
  const totalMembers = Object.values(memberCounts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-6 h-6 text-[#ff5a1f]" />
        <h1 className="text-2xl font-heading font-bold">SACCOs & Groups</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">View all SACCOs and welfare groups in your county</p>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-[#ff5a1f] mb-3"><Building2 className="w-5 h-5" /></div>
          <p className="text-2xl font-heading font-bold">{saccos.length}</p>
          <p className="text-xs text-muted-foreground">Total SACCOs</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 text-green-600 mb-3"><CheckCircle2 className="w-5 h-5" /></div>
          <p className="text-2xl font-heading font-bold">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-[#ff5a1f] mb-3"><Users className="w-5 h-5" /></div>
          <p className="text-2xl font-heading font-bold">{totalMembers}</p>
          <p className="text-xs text-muted-foreground">Total Members</p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by SACCO name..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No SACCOs found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const sOfficials = officials[s.id] || [];
            return (
              <div key={s.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#ff5a1f]" />
                    <p className="font-heading font-bold text-sm">{s.name}</p>
                  </div>
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${s.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                    {s.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{memberCounts[s.id] || 0} members</p>
                {sOfficials.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border space-y-1">
                    {sOfficials.map(o => (
                      <div key={o.id} className="text-xs">
                        <span className="font-semibold capitalize text-[#ff5a1f]">{o.role}:</span>
                        <span className="text-muted-foreground ml-1">{o.full_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
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
      const groups = await base44.entities.Group.filter(countyId ? { county_id: countyId } : {});
      setSaccos(groups);

      const counts = {};
      const officialsMap = {};
      const subCountiesMap = {};
      const wardsMap = {};

      // Fetch sub-counties and wards for coverage display
      const [subCounties, wards] = await Promise.all([
        countyId ? base44.entities.SubCounty.filter({ county_id: countyId }).catch(() => []) : [],
        countyId ? base44.entities.Ward.filter({ county_id: countyId }).catch(() => []) : [],
      ]);

      await Promise.all(groups.map(async g => {
        const [members, officials] = await Promise.all([
          base44.entities.GroupMember.filter({ group_id: g.id, status: 'approved' }).catch(() => []),
          base44.entities.GroupOfficial.filter({ group_id: g.id, status: 'active' }).catch(() => []),
        ]);
        counts[g.id] = members.length;

        const officialUsers = await Promise.all(officials.map(o => base44.entities.User.get(o.user_id).catch(() => null)));
        officialsMap[g.id] = officialUsers.filter(Boolean).map((u, i) => ({ ...u, role: officials[i].role, kyc_complete: officials[i].kyc_complete }));

        // Coverage labels
        if (g.coverage_type === 'sub_county' && g.coverage_sub_county_ids?.length > 0) {
          subCountiesMap[g.id] = g.coverage_sub_county_ids.map(id => subCounties.find(sc => sc.id === id)?.name).filter(Boolean);
        } else if (g.coverage_type === 'ward' && g.coverage_ward_ids?.length > 0) {
          wardsMap[g.id] = g.coverage_ward_ids.map(id => wards.find(w => w.id === id)?.name).filter(Boolean);
        }
      }));
      setMemberCounts(counts);
      setOfficials(officialsMap);
    } catch (e) { console.error('SACCOs load error:', e); }
    setLoading(false);
  }

  const filtered = search.trim()
    ? saccos.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()))
    : saccos;

  const activeCount = saccos.filter(s => (s.group_state || 'BASIC_ACTIVE') !== 'DEACTIVATED').length;
  const verifiedCount = saccos.filter(s => s.group_state === 'VERIFIED').length;
  const totalMembers = Object.values(memberCounts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-6 h-6 text-[#ff5a1f]" />
        <h1 className="text-2xl font-heading font-bold">SACCOs & Groups</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">View all SACCOs and welfare groups in your county</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
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
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 mb-3"><Building2 className="w-5 h-5" /></div>
          <p className="text-2xl font-heading font-bold">{verifiedCount}</p>
          <p className="text-xs text-muted-foreground">Verified</p>
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
            const state = s.group_state || 'BASIC_ACTIVE';
            const stateBadge = {
              BASIC_ACTIVE: { label: 'Live', class: 'bg-green-50 text-green-600' },
              KYB_PENDING: { label: 'KYB Pending', class: 'bg-amber-50 text-amber-600' },
              KYB_REVIEW: { label: 'Under Review', class: 'bg-amber-50 text-amber-600' },
              VERIFIED: { label: 'Verified', class: 'bg-blue-50 text-blue-600' },
              SUSPENDED: { label: 'Suspended', class: 'bg-red-50 text-red-600' },
              DEACTIVATED: { label: 'Inactive', class: 'bg-stone-100 text-stone-500' },
            }[state] || { label: state, class: 'bg-muted text-muted-foreground' };
            return (
              <div key={s.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#ff5a1f]" />
                    <p className="font-heading font-bold text-sm">{s.name}</p>
                  </div>
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${stateBadge.class}`}>
                    {stateBadge.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                  <span className="capitalize">{s.type}</span>
                  <span>·</span>
                  <span>{memberCounts[s.id] || 0} members</span>
                  {s.membership_size_band && <><span>·</span><span>{s.membership_size_band} band</span></>}
                </div>
                {s.coverage_type && s.coverage_type !== 'county' && (
                  <p className="text-[10px] text-muted-foreground mb-1">
                    Coverage: {s.coverage_type === 'sub_county' ? 'Sub-counties' : 'Wards'}
                  </p>
                )}
                {sOfficials.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border space-y-1">
                    {sOfficials.map(o => (
                      <div key={o.id} className="text-xs flex items-center justify-between">
                        <div>
                          <span className="font-semibold capitalize text-[#ff5a1f]">{o.role.replace('_', ' ')}:</span>
                          <span className="text-muted-foreground ml-1">{o.full_name}</span>
                        </div>
                        {o.kyc_complete && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                      </div>
                    ))}
                  </div>
                )}
                {s.duplicate_flagged && (
                  <div className="mt-2 text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-0.5">⚠ Flagged as duplicate</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
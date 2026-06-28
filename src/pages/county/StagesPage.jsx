import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDate } from '@/lib/format';
import { MapPin, Search, Users, CheckCircle2 } from 'lucide-react';

export default function CountyStages() {
  const { user } = useAuth();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [stages, setStages] = useState([]);
  const [leaders, setLeaders] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const s = await base44.entities.Stage.filter(countyId ? { county_id: countyId } : {});
      setStages(s);

      const leaderIds = [...new Set(s.map(st => st.leader_id).filter(Boolean))];
      const leaderUsers = await Promise.all(leaderIds.map(id => base44.entities.User.get(id).catch(() => null)));
      setLeaders(Object.fromEntries(leaderUsers.filter(Boolean).map(u => [u.id, u])));
    } catch (e) { console.error('Stages load error:', e); }
    setLoading(false);
  }

  const filtered = search.trim()
    ? stages.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()))
    : stages;

  const approvedCount = stages.filter(s => s.application_status === 'approved').length;
  const pendingCount = stages.filter(s => s.application_status === 'pending_county').length;
  const totalMembers = stages.reduce((sum, s) => sum + (s.member_count || 0), 0);

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-6 h-6 text-[#ff5a1f]" />
        <h1 className="text-2xl font-heading font-bold">Stages</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Manage bodaboda stages across your county</p>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-[#ff5a1f] mb-3"><MapPin className="w-5 h-5" /></div>
          <p className="text-2xl font-heading font-bold">{stages.length}</p>
          <p className="text-xs text-muted-foreground">Total Stages</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 text-green-600 mb-3"><CheckCircle2 className="w-5 h-5" /></div>
          <p className="text-2xl font-heading font-bold">{approvedCount}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-[#ff5a1f] mb-3"><Users className="w-5 h-5" /></div>
          <p className="text-2xl font-heading font-bold">{totalMembers}</p>
          <p className="text-xs text-muted-foreground">Total Members</p>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-sm">
          <span className="font-semibold text-amber-800">{pendingCount} stage application(s) pending county approval</span>
          <span className="text-amber-700 ml-2">— review in Registrations → Stages tab</span>
        </div>
      )}

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by stage name..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No stages found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const leader = leaders[s.leader_id];
            return (
              <div key={s.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#ff5a1f]" />
                    <p className="font-heading font-bold text-sm">{s.name}</p>
                  </div>
                  <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${s.application_status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                    {s.application_status || 'approved'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{s.member_count || 0} members</p>
                {leader && (
                  <div className="mt-2 pt-2 border-t border-border text-xs">
                    <p className="text-muted-foreground">
                      <span className="font-semibold">Leader:</span> {leader.full_name}
                    </p>
                    <p className="text-muted-foreground">{leader.phone || 'No phone'}</p>
                  </div>
                )}
                {s.description && <p className="text-xs text-muted-foreground mt-2">{s.description}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
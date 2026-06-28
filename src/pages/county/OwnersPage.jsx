import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDate } from '@/lib/format';
import { Bike, Users, Search, ArrowLeftRight } from 'lucide-react';
import BikeDetailSheet from '@/components/BikeDetailSheet';

export default function CountyOwners() {
  const { user } = useAuth();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [vehicles, setVehicles] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailVehicleId, setDetailVehicleId] = useState(null);

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const v = await base44.entities.Vehicle.filter(countyId ? { county_id: countyId } : {});
      setVehicles(v);

      const ownerIds = [...new Set(v.filter(v => !v.is_owner_rider && v.owner_id).map(v => v.owner_id))];
      const ownerUsers = await Promise.all(ownerIds.map(id => base44.entities.User.get(id).catch(() => null)));
      setOwners(ownerUsers.filter(Boolean));
    } catch (e) { console.error('Owners load error:', e); }
    setLoading(false);
  }

  const ownerMap = new Map(owners.map(o => [o.id, o]));

  const ownerWithBikes = owners.map(o => ({
    ...o,
    bikes: vehicles.filter(v => v.owner_id === o.id && !v.is_owner_rider),
  }));

  const filtered = search.trim()
    ? ownerWithBikes.filter(o =>
        o.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.phone?.includes(search) ||
        o.email?.toLowerCase().includes(search.toLowerCase())
      )
    : ownerWithBikes;

  const totalBikes = vehicles.filter(v => !v.is_owner_rider).length;
  const totalOwners = owners.length;
  const avgFleet = totalOwners > 0 ? (totalBikes / totalOwners).toFixed(1) : '0';

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <Bike className="w-6 h-6 text-[#ff5a1f]" />
        <h1 className="text-2xl font-heading font-bold">Owners & Fleets</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Manage vehicle owners and track fleet sizes</p>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-[#ff5a1f] mb-3"><Users className="w-5 h-5" /></div>
          <p className="text-2xl font-heading font-bold">{totalOwners}</p>
          <p className="text-xs text-muted-foreground">Owners</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-[#ff5a1f] mb-3"><Bike className="w-5 h-5" /></div>
          <p className="text-2xl font-heading font-bold">{totalBikes}</p>
          <p className="text-xs text-muted-foreground">Bikes Managed</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-[#ff5a1f] mb-3"><ArrowLeftRight className="w-5 h-5" /></div>
          <p className="text-2xl font-heading font-bold">{avgFleet}</p>
          <p className="text-xs text-muted-foreground">Avg Fleet Size</p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by owner name, phone, or email..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No vehicle owners found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => (
            <div key={o.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-heading font-bold">{o.full_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{o.phone || o.email || 'No contact'}</p>
                </div>
                <span className="text-xs font-semibold bg-orange-50 text-[#ff5a1f] rounded-full px-2 py-0.5">{o.bikes.length} bike(s)</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {o.bikes.map(b => (
                  <button key={b.id} onClick={() => setDetailVehicleId(b.id)}
                    className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 hover:bg-accent transition-colors text-left">
                    <Bike className="w-4 h-4 text-[#ff5a1f] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{b.plate_number}</p>
                      <p className="text-[10px] text-muted-foreground">{b.make} · {b.status}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {detailVehicleId && (
        <BikeDetailSheet vehicleId={detailVehicleId} onClose={() => setDetailVehicleId(null)} isStaff accent="orange" />
      )}
    </div>
  );
}
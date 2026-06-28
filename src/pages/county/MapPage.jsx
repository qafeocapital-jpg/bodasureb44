import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Map, MapPin, Users, BadgeCheck, AlertCircle, Grid2x2 } from 'lucide-react';
import CountyMapView from '@/components/county/CountyMapView';

export default function CountyMap() {
  const { user } = useAuth();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [vehicles, setVehicles] = useState([]);
  const [permits, setPermits] = useState([]);
  const [subCounties, setSubCounties] = useState([]);
  const [wards, setWards] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const vehicleFilter = countyId ? { county_id: countyId } : {};
      const permitFilter = countyId ? { county_id: countyId } : {};
      const [v, p, sc, w, st] = await Promise.all([
        base44.entities.Vehicle.filter(vehicleFilter),
        base44.entities.Permit.filter(permitFilter, '-created_date', 200),
        countyId ? base44.entities.SubCounty.filter({ county_id: countyId }).catch(() => []) : base44.entities.SubCounty.filter({}).catch(() => []),
        countyId ? base44.entities.Ward.filter({ county_id: countyId }).catch(() => []) : base44.entities.Ward.filter({}).catch(() => []),
        countyId ? base44.entities.Stage.filter({ county_id: countyId }).catch(() => []) : base44.entities.Stage.filter({}).catch(() => []),
      ]);
      setVehicles(v); setPermits(p); setSubCounties(sc); setWards(w); setStages(st);
    } catch (e) { console.error('Map load error:', e); }
    setLoading(false);
  }

  const now = new Date();
  const activePermitVehicleIds = new Set(
    permits.filter(p => p.status === 'active' && (!p.end_date || new Date(p.end_date) > now)).map(p => p.vehicle_id)
  );

  const totalVehicles = vehicles.length;
  const totalCompliant = vehicles.filter(v => activePermitVehicleIds.has(v.id)).length;
  const overallRate = totalVehicles > 0 ? Math.round((totalCompliant / totalVehicles) * 100) : 0;
  const stagesWithCoords = stages.filter(s => s.location_lat && s.location_lng);
  const showMap = stagesWithCoords.length > 0;

  // Sub-county breakdown for fallback table
  const scBreakdown = subCounties.map(sc => {
    const scVehicles = vehicles.filter(v => v.sub_county_id === sc.id);
    const scCompliant = scVehicles.filter(v => activePermitVehicleIds.has(v.id)).length;
    const scWards = wards.filter(w => w.sub_county_id === sc.id);
    const scStages = stages.filter(s => s.sub_county_id === sc.id || scWards.some(w => w.id === s.ward_id));
    return {
      ...sc,
      total: scVehicles.length,
      compliant: scCompliant,
      nonCompliant: scVehicles.length - scCompliant,
      rate: scVehicles.length > 0 ? Math.round((scCompliant / scVehicles.length) * 100) : 0,
      wardCount: scWards.length,
      stageCount: scStages.length,
    };
  });

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <Map className="w-6 h-6 text-[#ff5a1f]" />
        <h1 className="text-2xl font-heading font-bold">Geographic Overview</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        {showMap ? 'Live compliance map with stage and vehicle markers' : 'Compliance and distribution by sub-county and ward'}
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : (
        <>
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-[#ff5a1f] mb-3">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-2xl font-heading font-bold">{totalVehicles}</p>
              <p className="text-xs text-muted-foreground">Total Vehicles</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 text-green-600 mb-3">
                <BadgeCheck className="w-5 h-5" />
              </div>
              <p className="text-2xl font-heading font-bold">{totalCompliant}</p>
              <p className="text-xs text-muted-foreground">Compliant</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50 text-red-600 mb-3">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-2xl font-heading font-bold">{totalVehicles - totalCompliant}</p>
              <p className="text-xs text-muted-foreground">Non-Compliant</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-[#ff5a1f] mb-3">
                <MapPin className="w-5 h-5" />
              </div>
              <p className="text-2xl font-heading font-bold">{stages.length}</p>
              <p className="text-xs text-muted-foreground">Stages</p>
            </div>
          </div>

          {/* Map or Fallback Table */}
          {showMap ? (
            <CountyMapView countyId={countyId} vehicles={vehicles} permits={permits} stages={stages} />
          ) : (
            <div className="bg-accent border border-border rounded-xl p-6 text-center mb-5">
              <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No stages have location data yet. The map will appear here once stages are pinned during rider onboarding.
                Showing sub-county breakdown below.
              </p>
            </div>
          )}

          {/* Sub-county breakdown (always visible as supplementary data) */}
          {subCounties.length > 0 && (
            <div className="mt-6">
              <h2 className="font-heading font-bold mb-3 flex items-center gap-2">
                <Grid2x2 className="w-5 h-5 text-[#ff5a1f]" />
                Sub-County Breakdown
              </h2>
              <div className="space-y-4">
                {scBreakdown.map(sc => (
                  <div key={sc.id} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[#ff5a1f]" />
                        <h3 className="font-heading font-bold">{sc.name}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{sc.wardCount} wards</span>
                        <span>·</span>
                        <span>{sc.stageCount} stages</span>
                      </div>
                    </div>

                    {sc.total > 0 ? (
                      <>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{sc.compliant}/{sc.total} vehicles compliant</span>
                          <span className={`font-semibold ${sc.rate >= 75 ? 'text-green-600' : sc.rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{sc.rate}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${sc.rate >= 75 ? 'bg-green-500' : sc.rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${sc.rate}%` }} />
                        </div>
                        <div className="flex gap-4 mt-3 text-xs">
                          <span className="text-green-600 font-medium">{sc.compliant} compliant</span>
                          <span className="text-red-600 font-medium">{sc.nonCompliant} non-compliant</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">No vehicles registered in this sub-county</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!showMap && subCounties.length === 0 && (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Grid2x2 className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No sub-counties defined. Add them in Sub-Counties to see geographic breakdowns.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
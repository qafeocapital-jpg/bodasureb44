import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function StageMap({ countyId }) {
  const [stages, setStages] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        const stageFilter = countyId ? { county_id: countyId } : {};
        const allStages = await base44.entities.Stage.filter(stageFilter);
        setStages(allStages);

        const vehicleFilter = countyId ? { county_id: countyId } : {};
        const [vehicles, permits] = await Promise.all([
          base44.entities.Vehicle.filter(vehicleFilter, '-created_date', 100),
          base44.entities.Permit.filter(countyId ? { county_id: countyId, status: 'active' } : { status: 'active' }, '-created_date', 100),
        ]);

        const statsMap = {};
        allStages.forEach(s => {
          const stageBikes = vehicles.filter(v => v.stage_id === s.id);
          const stagePermits = permits.filter(p => p.vehicle_id && stageBikes.some(b => b.id === p.vehicle_id));
          const bikeCount = stageBikes.length;
          const permitCount = stagePermits.length;
          const complianceRate = bikeCount > 0 ? Math.round((permitCount / bikeCount) * 100) : 0;
          statsMap[s.id] = { bikes: bikeCount, activePermits: permitCount, complianceRate };
        });
        setStats(statsMap);
      } catch (e) {}
      setLoading(false);
    }
    loadData();
  }, [countyId]);

  useEffect(() => {
    if (loading || !MAPBOX_TOKEN || !mapContainerRef.current) return;
    const stagesWithCoords = stages.filter(s => s.location_lat && s.location_lng);
    if (stagesWithCoords.length === 0) return;
    let cancelled = false;

    async function initMap() {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      mapboxgl.accessToken = MAPBOX_TOKEN;
      if (cancelled || mapRef.current) return;

      const center = [stagesWithCoords[0].location_lng, stagesWithCoords[0].location_lat];

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: 11,
      });
      mapRef.current = map;

      map.on('load', () => {
        if (cancelled) return;
        stagesWithCoords.forEach(s => {
          const stat = stats[s.id] || { bikes: 0, activePermits: 0, complianceRate: 0 };
          const rate = stat.complianceRate;
          const color = rate > 80 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444';

          const el = document.createElement('div');
          el.style.backgroundColor = color;
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.borderRadius = '50%';
          el.style.border = '2px solid white';
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div style="font-family: sans-serif; min-width: 160px;">
              <p style="font-weight: 700; font-size: 14px; margin: 0 0 6px;">${s.name}</p>
              <p style="font-size: 12px; margin: 2px 0; color: #666;">Bikes: ${stat.bikes}</p>
              <p style="font-size: 12px; margin: 2px 0; color: #666;">Active Permits: ${stat.activePermits}</p>
              <p style="font-size: 12px; margin: 2px 0; color: ${color}; font-weight: 600;">Compliance: ${rate}%</p>
            </div>`
          );

          new mapboxgl.Marker(el)
            .setLngLat([s.location_lng, s.location_lat])
            .setPopup(popup)
            .addTo(map);
        });

        if (stagesWithCoords.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          stagesWithCoords.forEach(s => bounds.extend([s.location_lng, s.location_lat]));
          map.fitBounds(bounds, { padding: 40 });
        }
      });
    }
    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading, stages, stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!MAPBOX_TOKEN) {
    return (
      <div className="bg-accent rounded-xl p-6 text-center">
        <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Set VITE_MAPBOX_TOKEN to enable the stage map view.</p>
      </div>
    );
  }

  if (stages.filter(s => s.location_lat && s.location_lng).length === 0) {
    return (
      <div className="bg-accent rounded-xl p-6 text-center">
        <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No stages have location data yet. Stages will appear on the map as riders pin their locations during onboarding.</p>
      </div>
    );
  }

  return (
    <div>
      <div ref={mapContainerRef} className="w-full h-[400px] rounded-xl overflow-hidden border border-border" />
      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-success" /> High compliance (&gt;80%)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-warning" /> Medium (40-80%)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-destructive" /> Low (&lt;40%)</span>
      </div>
    </div>
  );
}
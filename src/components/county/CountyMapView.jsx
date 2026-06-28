import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, Bike } from 'lucide-react';

export default function CountyMapView({ countyId, vehicles, permits, stages }) {
  const [mapboxToken, setMapboxToken] = useState('');
  const [loading, setLoading] = useState(true);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  // Fetch Mapbox token from backend
  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await base44.functions.invoke('getMapboxToken', {});
        if (res.data?.token) setMapboxToken(res.data.token);
      } catch (e) {}
      setLoading(false);
    }
    fetchToken();
  }, []);

  const stagesWithCoords = stages.filter(s => s.location_lat && s.location_lng);

  useEffect(() => {
    if (loading || !mapboxToken || !mapContainerRef.current) return;
    if (stagesWithCoords.length === 0) return;
    let cancelled = false;

    async function initMap() {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      mapboxgl.accessToken = mapboxToken;
      if (cancelled || mapRef.current) return;

      const center = [stagesWithCoords[0].location_lng, stagesWithCoords[0].location_lat];

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: 11,
      });
      mapRef.current = map;

      // Build active permit set
      const now = new Date();
      const activePermitVehicleIds = new Set(
        permits.filter(p => p.status === 'active' && (!p.end_date || new Date(p.end_date) > now)).map(p => p.vehicle_id)
      );

      // Build stage stats
      const statsMap = {};
      stages.forEach(s => {
        const stageBikes = vehicles.filter(v => v.stage_id === s.id);
        const stagePermits = permits.filter(p => p.vehicle_id && stageBikes.some(b => b.id === p.vehicle_id) && p.status === 'active' && (!p.end_date || new Date(p.end_date) > now));
        const bikeCount = stageBikes.length;
        const permitCount = stagePermits.length;
        const complianceRate = bikeCount > 0 ? Math.round((permitCount / bikeCount) * 100) : 0;
        statsMap[s.id] = { bikes: bikeCount, activePermits: permitCount, complianceRate, nonCompliant: bikeCount - permitCount };
      });

      map.on('load', () => {
        if (cancelled) return;

        // Stage pins (large, compliance-colored)
        stagesWithCoords.forEach(s => {
          const stat = statsMap[s.id] || { bikes: 0, activePermits: 0, complianceRate: 0, nonCompliant: 0 };
          const rate = stat.complianceRate;
          const color = rate > 80 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444';

          const el = document.createElement('div');
          el.style.backgroundColor = color;
          el.style.width = '24px';
          el.style.height = '24px';
          el.style.borderRadius = '50%';
          el.style.border = '3px solid white';
          el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
          el.style.cursor = 'pointer';

          // Vehicle list HTML for popup
          const stageBikes = vehicles.filter(v => v.stage_id === s.id);
          const bikeListHtml = stageBikes.length > 0
            ? stageBikes.slice(0, 8).map(v => {
                const hasPermit = activePermitVehicleIds.has(v.id);
                const dot = hasPermit ? '🟢' : '🔴';
                return `<div style="font-size:11px; padding:1px 0;">${dot} ${v.plate_number}</div>`;
              }).join('') + (stageBikes.length > 8 ? `<div style="font-size:10px; color:#999; padding-top:2px;">+${stageBikes.length - 8} more</div>` : '')
            : '<div style="font-size:11px; color:#999;">No vehicles registered</div>';

          const popup = new mapboxgl.Popup({ offset: 30 }).setHTML(
            `<div style="font-family: sans-serif; min-width: 180px;">
              <p style="font-weight: 700; font-size: 14px; margin: 0 0 6px;">${s.name}</p>
              <p style="font-size: 12px; margin: 2px 0; color: #666;">Bikes: ${stat.bikes}</p>
              <p style="font-size: 12px; margin: 2px 0; color: #666;">Active Permits: ${stat.activePermits}</p>
              <p style="font-size: 12px; margin: 2px 0; color: ${color}; font-weight: 600;">Compliance: ${rate}%</p>
              <div style="border-top: 1px solid #eee; margin-top: 6px; padding-top: 6px;">
                <p style="font-size: 10px; font-weight: 600; margin: 0 0 3px; color: #999; text-transform: uppercase;">Vehicles</p>
                ${bikeListHtml}
              </div>
            </div>`
          );

          new mapboxgl.Marker(el)
            .setLngLat([s.location_lng, s.location_lat])
            .setPopup(popup)
            .addTo(map);
        });

        // Vehicle markers (small dots, green/red based on active permit)
        vehicles.forEach(v => {
          if (!v.stage_id) return;
          const stage = stages.find(s => s.id === v.stage_id);
          if (!stage || !stage.location_lat || !stage.location_lng) return;

          const hasPermit = activePermitVehicleIds.has(v.id);
          const color = hasPermit ? '#22c55e' : '#ef4444';

          const el = document.createElement('div');
          el.style.backgroundColor = color;
          el.style.width = '10px';
          el.style.height = '10px';
          el.style.borderRadius = '50%';
          el.style.border = '1.5px solid white';
          el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.3)';
          el.style.cursor = 'pointer';

          // Slight offset so vehicle dots don't fully overlap the stage pin
          const offsetLng = (Math.random() - 0.5) * 0.003;
          const offsetLat = (Math.random() - 0.5) * 0.003;

          const popup = new mapboxgl.Popup({ offset: 15 }).setHTML(
            `<div style="font-family: sans-serif; min-width: 120px;">
              <p style="font-weight: 700; font-size: 13px; margin: 0 0 4px;">${v.plate_number}</p>
              <p style="font-size: 11px; margin: 1px 0; color: #666;">${v.make || ''} ${v.model || ''}</p>
              <p style="font-size: 11px; margin: 3px 0 0; color: ${color}; font-weight: 600;">
                ${hasPermit ? '✓ Active Permit' : '✗ No Active Permit'}
              </p>
            </div>`
          );

          new mapboxgl.Marker(el)
            .setLngLat([stage.location_lng + offsetLng, stage.location_lat + offsetLat])
            .setPopup(popup)
            .addTo(map);
        });

        if (stagesWithCoords.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          stagesWithCoords.forEach(s => bounds.extend([s.location_lng, s.location_lat]));
          map.fitBounds(bounds, { padding: 50 });
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
  }, [loading, stages, vehicles, permits, mapboxToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!mapboxToken) {
    return (
      <div className="bg-accent rounded-xl p-6 text-center">
        <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Set VITE_MAPBOX_TOKEN to enable the map view.</p>
      </div>
    );
  }

  if (stagesWithCoords.length === 0) {
    return null; // Parent handles fallback
  }

  return (
    <div>
      <div ref={mapContainerRef} className="w-full h-[500px] rounded-xl overflow-hidden border border-border" />
      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-success border border-white shadow-sm" /> Active Permit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-destructive border border-white shadow-sm" /> No Permit
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <Bike className="w-3 h-3" /> Vehicle markers appear at their stage location
        </span>
      </div>
    </div>
  );
}
import { useRef, useEffect, useState } from 'react';
import { getCountyCenter, isInCounty } from '@/lib/countyBounds';
import { Layers, Satellite, Map as MapIcon } from 'lucide-react';

/**
 * Core Mapbox GL map with all controls: NavigationControl (top-right),
 * GeolocateControl (bottom-right), ScaleControl (bottom-left),
 * style switcher pill (bottom-left overlay), rich popups, animated flyTo.
 */
export default function StageMap({
  wardId, countyName, stages, selectedStageId, memberCounts,
  mapCoords, mapboxToken, onMapClick, onSelectStage,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapboxglRef = useRef(null);
  const pinMarkerRef = useRef(null);
  const stageMarkersRef = useRef([]);
  const geolocateRef = useRef(null);
  const countyNameRef = useRef(countyName);
  const [styleView, setStyleView] = useState('streets');

  countyNameRef.current = countyName;

  // Map init — mounts when token + wardId are both available
  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current) return;
    let cancelled = false;

    async function initMap() {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      mapboxgl.accessToken = mapboxToken;
      mapboxglRef.current = mapboxgl;
      if (cancelled || mapRef.current) return;

      const center = getCountyCenter(countyNameRef.current);
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: 11,
      });
      mapRef.current = map;

      // Zoom + compass navigation control (top-right)
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right');

      // Scale indicator (bottom-left)
      map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');

      // GPS Locate Me control (bottom-right)
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showAccuracyCircle: true,
        showUserLocation: true,
      });
      geolocateRef.current = geolocate;
      map.addControl(geolocate, 'bottom-right');

      // When GPS fires, check county geo-fence
      geolocate.on('geolocate', (pos) => {
        const coords = [pos.coords.longitude, pos.coords.latitude];
        if (!isInCounty(coords[0], coords[1], countyNameRef.current)) {
          onMapClick?.(null, `This location is outside your county — please pin within ${countyNameRef.current}.`);
        }
      });

      map.on('click', (e) => {
        const coords = [e.lngLat.lng, e.lngLat.lat];
        onMapClick?.(coords);
      });
    }
    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        pinMarkerRef.current = null;
        stageMarkersRef.current = [];
        mapboxglRef.current = null;
        geolocateRef.current = null;
      }
    };
  }, [mapboxToken, wardId]);

  // Style switcher — preserves all markers (Marker objects survive setStyle)
  function toggleStyle() {
    const map = mapRef.current;
    if (!map) return;
    const newStyle = styleView === 'streets' ? 'satellite' : 'streets';
    setStyleView(newStyle);
    map.setStyle(newStyle === 'streets'
      ? 'mapbox://styles/mapbox/streets-v12'
      : 'mapbox://styles/mapbox/satellite-streets-v12');
  }

  // Update stage markers when stages/selection change
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxglRef.current;
    if (!map || !mapboxgl || !wardId) return;

    stageMarkersRef.current.forEach(m => m.remove());
    stageMarkersRef.current = [];

    const stagesWithCoords = stages.filter(s => s.location_lat && s.location_lng);

    function addMarkers() {
      stagesWithCoords.forEach(s => {
        const isSelected = s.id === selectedStageId;
        const el = document.createElement('div');
        el.style.backgroundColor = isSelected ? '#f97316' : '#3b82f6';
        el.style.width = isSelected ? '22px' : '14px';
        el.style.height = isSelected ? '22px' : '14px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onSelectStage?.(s);
        });

        const count = memberCounts[s.id] || 0;
        const safeName = s.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        const popupHtml = `
          <div style="padding:4px 2px;">
            <p style="font-weight:700;margin:0;font-size:13px;color:#1a1a1a;">${safeName}</p>
            <p style="font-size:11px;color:#666;margin:3px 0 0;">📍 ${count} member${count !== 1 ? 's' : ''}</p>
            <p style="font-size:10px;color:#999;margin:2px 0 0;">Tap to select this stage</p>
          </div>
        `;
        const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(popupHtml);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([s.location_lng, s.location_lat])
          .setPopup(popup)
          .addTo(map);
        stageMarkersRef.current.push(marker);
      });

      if (selectedStageId) {
        const sel = stagesWithCoords.find(s => s.id === selectedStageId);
        if (sel) map.flyTo({ center: [sel.location_lng, sel.location_lat], zoom: 15, duration: 1200 });
      } else if (stagesWithCoords.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        stagesWithCoords.forEach(s => bounds.extend([s.location_lng, s.location_lat]));
        map.fitBounds(bounds, { padding: 40, duration: 1000 });
      } else if (stagesWithCoords.length === 1) {
        map.flyTo({ center: [stagesWithCoords[0].location_lng, stagesWithCoords[0].location_lat], zoom: 14, duration: 1200 });
      }
    }

    if (map.loaded()) addMarkers();
    else map.once('load', addMarkers);
  }, [stages, selectedStageId, memberCounts, wardId]);

  // Update draggable orange pin when coords change
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxglRef.current;
    if (!map || !mapCoords) return;

    function updatePin() {
      if (pinMarkerRef.current) {
        pinMarkerRef.current.setLngLat(mapCoords);
      } else {
        const marker = new mapboxgl.Marker({ draggable: true, color: '#f97316' })
          .setLngLat(mapCoords)
          .addTo(map);
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          onMapClick?.([lngLat.lng, lngLat.lat]);
        });
        pinMarkerRef.current = marker;
      }
    }

    if (map.loaded()) updatePin();
    else map.once('load', updatePin);
  }, [mapCoords]);

  if (!mapboxToken) {
    return (
      <div className="w-full h-[260px] rounded-xl border border-border bg-slate-100 flex items-center justify-center">
        <div className="w-6 h-6 border-4 border-slate-300 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={mapContainerRef} className="w-full h-[260px] rounded-xl overflow-hidden border border-border bg-slate-100" />

      {/* Style switcher pill (bottom-left overlay) */}
      <button
        onClick={toggleStyle}
        className="absolute bottom-8 left-2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm shadow-md border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-white transition-colors"
      >
        {styleView === 'streets'
          ? <><Satellite className="w-3.5 h-3.5 text-blue-500" /> Satellite</>
          : <><MapIcon className="w-3.5 h-3.5 text-orange-500" /> Streets</>}
      </button>
    </div>
  );
}
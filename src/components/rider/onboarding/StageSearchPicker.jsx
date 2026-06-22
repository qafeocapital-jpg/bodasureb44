import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getCountyCenter, isInCounty } from '@/lib/countyBounds';
import { MapPin, Search, Loader2, Check, X, Plus, AlertTriangle } from 'lucide-react';

export default function StageSearchPicker({ wardId, countyId, countyName, stages, selectedStageId, onSelect, onStagesChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mapboxToken, setMapboxToken] = useState('');
  const [mapCoords, setMapCoords] = useState(null);
  const [placeResults, setPlaceResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [geoError, setGeoError] = useState('');
  const [memberCounts, setMemberCounts] = useState({});

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapboxglRef = useRef(null);
  const pinMarkerRef = useRef(null);
  const stageMarkersRef = useRef([]);
  const debounceRef = useRef(null);
  const countyNameRef = useRef(countyName);

  countyNameRef.current = countyName;

  // Fetch Mapbox token immediately on mount
  useEffect(() => {
    base44.functions.invoke('getMapboxToken', {}).then(res => {
      if (res.data?.token) setMapboxToken(res.data.token);
    }).catch(() => {});
  }, []);

  // Fetch real member counts
  useEffect(() => {
    async function fetchCounts() {
      if (!wardId) { setMemberCounts({}); return; }
      try {
        const vehicles = await base44.entities.Vehicle.filter({ ward_id: wardId });
        const counts = {};
        vehicles.forEach(v => { if (v.stage_id) counts[v.stage_id] = (counts[v.stage_id] || 0) + 1; });
        setMemberCounts(counts);
      } catch (e) {}
    }
    fetchCounts();
  }, [wardId, stages]);

  // Geocoding search with debounce
  useEffect(() => {
    if (!mapboxToken || !searchQuery.trim() || searchQuery.trim().length < 2) {
      setPlaceResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const center = getCountyCenter(countyNameRef.current);
      const proximity = `${center[0]},${center[1]}`;
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery.trim())}.json?access_token=${mapboxToken}&country=ke&proximity=${proximity}&limit=5`;
        const res = await fetch(url);
        const data = await res.json();
        setPlaceResults(data.features || []);
      } catch (e) { setPlaceResults([]); }
      setSearching(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, mapboxToken]);

  // Map init — mounts immediately when token arrives, centered on county
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

      map.on('click', (e) => {
        const coords = [e.lngLat.lng, e.lngLat.lat];
        tryPlacePin(coords, '');
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
      }
    };
  }, [mapboxToken]);

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
        el.addEventListener('click', (ev) => { ev.stopPropagation(); handleSelectExisting(s); });

        const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(
          `<p style="font-weight:600;margin:0;">${s.name}</p><p style="font-size:11px;color:#666;margin:2px 0 0;">${memberCounts[s.id] || 0} members</p>`
        );

        const marker = new mapboxgl.Marker(el)
          .setLngLat([s.location_lng, s.location_lat])
          .setPopup(popup)
          .addTo(map);
        stageMarkersRef.current.push(marker);
      });

      if (selectedStageId) {
        const sel = stagesWithCoords.find(s => s.id === selectedStageId);
        if (sel) map.flyTo({ center: [sel.location_lng, sel.location_lat], zoom: 15 });
      } else if (stagesWithCoords.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        stagesWithCoords.forEach(s => bounds.extend([s.location_lng, s.location_lat]));
        map.fitBounds(bounds, { padding: 40 });
      } else if (stagesWithCoords.length === 1) {
        map.flyTo({ center: [stagesWithCoords[0].location_lng, stagesWithCoords[0].location_lat], zoom: 14 });
      }
    }

    if (map.loaded()) addMarkers();
    else map.once('load', addMarkers);
  }, [stages, selectedStageId, memberCounts, wardId]);

  // Update pin marker when coords change
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
          tryPlacePin([lngLat.lng, lngLat.lat], newStageName);
        });
        pinMarkerRef.current = marker;
      }
    }

    if (map.loaded()) updatePin();
    else map.once('load', updatePin);
  }, [mapCoords]);

  function tryPlacePin(coords, nameHint) {
    if (!isInCounty(coords[0], coords[1], countyNameRef.current)) {
      setGeoError(`This location is outside your county — please pin within ${countyNameRef.current}.`);
      setMapCoords(null);
      setShowCreate(false);
      if (pinMarkerRef.current) { pinMarkerRef.current.remove(); pinMarkerRef.current = null; }
      setTimeout(() => setGeoError(''), 4000);
      return;
    }
    setGeoError('');
    setMapCoords(coords);
    setNewStageName(nameHint || '');
    setShowCreate(true);
    const map = mapRef.current;
    if (map) map.flyTo({ center: coords, zoom: 15 });
  }

  function handleSelectExisting(stage) {
    onSelect(stage.id);
    setSearchQuery('');
    setPlaceResults([]);
    setShowCreate(false);
    setMapCoords(null);
    if (pinMarkerRef.current) { pinMarkerRef.current.remove(); pinMarkerRef.current = null; }
    const map = mapRef.current;
    if (map && stage.location_lat && stage.location_lng) {
      map.flyTo({ center: [stage.location_lng, stage.location_lat], zoom: 15 });
    }
  }

  function handleSelectPlace(feature) {
    tryPlacePin(feature.center, feature.text || (feature.place_name || '').split(',')[0] || '');
    setSearchQuery('');
    setPlaceResults([]);
  }

  async function handleCreateStage() {
    if (!newStageName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const name = newStageName.trim();
      const existing = stages.find(s => s.name.toLowerCase() === name.toLowerCase());
      if (existing) { onSelect(existing.id); resetCreate(); return; }

      const stageData = { name, ward_id: wardId, county_id: countyId };
      if (mapCoords) { stageData.location_lng = mapCoords[0]; stageData.location_lat = mapCoords[1]; }

      const created = await base44.entities.Stage.create(stageData);
      onStagesChange([...stages, created]);
      onSelect(created.id);
      resetCreate();
    } catch (e) {
      setError(e.message || 'Failed to create stage.');
    }
    setCreating(false);
  }

  function resetCreate() {
    setShowCreate(false);
    setNewStageName('');
    setMapCoords(null);
    setError('');
    if (pinMarkerRef.current) { pinMarkerRef.current.remove(); pinMarkerRef.current = null; }
  }

  if (!wardId) {
    return <p className="text-[10px] text-muted-foreground">Select a ward first to see the map.</p>;
  }

  const filteredStages = searchQuery.trim()
    ? stages.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : [];
  const showSuggestions = searchQuery.trim().length >= 2;
  const selectedStage = stages.find(s => s.id === selectedStageId);

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search stage or location..."
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
        {searchQuery && !searching && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Always-visible Map — container always rendered, map tiles load on their own */}
      <div ref={mapContainerRef} className="w-full h-[260px] rounded-xl overflow-hidden border border-border bg-slate-100" />

      {/* Geo-fence error */}
      {geoError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-start gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive font-medium">{geoError}</p>
        </div>
      )}

      {/* Selected stage indicator */}
      {selectedStage && !showCreate && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">{selectedStage.name}</p>
            <p className="text-[10px] text-muted-foreground">{memberCounts[selectedStage.id] || 0} members</p>
          </div>
        </div>
      )}

      {/* Search suggestions */}
      {showSuggestions && !showCreate && (
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden shadow-sm">
          {filteredStages.map(s => (
            <button key={s.id} onClick={() => handleSelectExisting(s)} className="w-full text-left p-3 flex items-center gap-2.5 hover:bg-accent transition-colors">
              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{memberCounts[s.id] || 0} members · Existing stage</p>
              </div>
            </button>
          ))}
          {placeResults.map(f => (
            <button key={f.id} onClick={() => handleSelectPlace(f)} className="w-full text-left p-3 flex items-start gap-2.5 hover:bg-accent transition-colors">
              <Plus className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">{f.text}</p>
                <p className="text-[10px] text-muted-foreground">{f.place_name}</p>
              </div>
            </button>
          ))}
          {!searching && filteredStages.length === 0 && placeResults.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No results. Try a different search or tap the map to pin a location.</p>
          )}
        </div>
      )}

      {/* Existing stages list */}
      {!showSuggestions && !showCreate && stages.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Stages in this ward</p>
          <div className="space-y-1.5">
            {stages.map(s => (
              <button key={s.id} onClick={() => handleSelectExisting(s)} className={`w-full text-left p-3 rounded-xl border-2 transition-colors flex items-center justify-between ${selectedStageId === s.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center gap-2">
                  <MapPin className={`w-4 h-4 ${selectedStageId === s.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{memberCounts[s.id] || 0} members</p>
                  </div>
                </div>
                {selectedStageId === s.id && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inline create-stage card */}
      {showCreate && (
        <div className="bg-accent rounded-xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm font-heading font-bold">Create New Stage</p>
            <button onClick={resetCreate} className="p-1 rounded-lg hover:bg-muted">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Stage Name</label>
            <input
              type="text"
              value={newStageName}
              onChange={e => setNewStageName(e.target.value)}
              placeholder="e.g. Kondele Stage"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {mapCoords && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 text-primary" /> Pinned at {mapCoords[1].toFixed(4)}, {mapCoords[0].toFixed(4)}
            </p>
          )}
          {error && <p className="text-[10px] text-destructive">{error}</p>}
          <button
            onClick={handleCreateStage}
            disabled={!newStageName.trim() || creating}
            className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Create stage here</>}
          </button>
        </div>
      )}
    </div>
  );
}
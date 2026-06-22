import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, MapPin, Loader2, Check, X } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const KISUMU_CENTER = [34.7467, -0.0917];

export default function StagePicker({ wardId, countyId, stages, selectedStageId, onSelect, onStagesChange }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [mapCoords, setMapCoords] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!showMap || !mapContainerRef.current || !MAPBOX_TOKEN) return;
    let cancelled = false;

    async function initMap() {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      mapboxgl.accessToken = MAPBOX_TOKEN;
      if (cancelled || mapRef.current) return;

      const center = mapCoords || KISUMU_CENTER;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: 13,
      });
      mapRef.current = map;

      map.on('load', () => {
        if (cancelled) return;
        const marker = new mapboxgl.Marker({ draggable: true })
          .setLngLat(center)
          .addTo(map);
        markerRef.current = marker;

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          setMapCoords([lngLat.lng, lngLat.lat]);
        });

        map.on('click', (e) => {
          marker.setLngLat(e.lngLat);
          setMapCoords([e.lngLat.lng, e.lngLat.lat]);
        });
      });
    }
    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [showMap]);

  function resetCreateForm() {
    setNewStageName('');
    setShowMap(false);
    setMapCoords(null);
    setError('');
  }

  async function handleCreateStage() {
    if (!newStageName.trim() || !wardId) return;
    setCreating(true);
    setError('');
    try {
      const name = newStageName.trim();
      const existing = stages.find(s => s.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        onSelect(existing.id);
        setShowCreate(false);
        resetCreateForm();
        return;
      }

      const stageData = {
        name,
        ward_id: wardId,
        county_id: countyId,
      };
      if (mapCoords) {
        stageData.location_lng = mapCoords[0];
        stageData.location_lat = mapCoords[1];
      }

      const created = await base44.entities.Stage.create(stageData);
      onStagesChange([...stages, created]);
      onSelect(created.id);
      setShowCreate(false);
      resetCreateForm();
    } catch (e) {
      setError(e.message || 'Failed to create stage. Try again.');
    }
    setCreating(false);
  }

  if (!wardId) {
    return <p className="text-[10px] text-muted-foreground">Select a ward first to see available stages.</p>;
  }

  return (
    <div className="space-y-2">
      {stages.length === 0 && !showCreate && (
        <p className="text-xs text-muted-foreground text-center py-2">No stages found in this ward yet. Create one below.</p>
      )}
      {stages.map(s => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={`w-full text-left p-3 rounded-xl border-2 transition-colors flex items-center justify-between ${
            selectedStageId === s.id ? 'border-primary bg-primary/5' : 'border-border'
          }`}
        >
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 ${selectedStageId === s.id ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm font-semibold">{s.name}</p>
              <p className="text-[10px] text-muted-foreground">{s.member_count || 0} members</p>
            </div>
          </div>
          {selectedStageId === s.id && <Check className="w-4 h-4 text-primary" />}
        </button>
      ))}

      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full p-3 rounded-xl border-2 border-dashed border-primary/30 text-primary flex items-center justify-center gap-1.5 hover:bg-primary/5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-semibold">Create new stage</span>
        </button>
      ) : (
        <div className="bg-accent rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-heading font-bold">New Stage</p>
            <button onClick={() => { setShowCreate(false); resetCreateForm(); }} className="p-1 rounded-lg hover:bg-muted">
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

          <div>
            {!showMap ? (
              <button
                onClick={() => setShowMap(true)}
                className="w-full flex items-center justify-center gap-1.5 border border-dashed border-border rounded-xl py-2.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                <MapPin className="w-4 h-4" /> Pin location on map (optional)
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Stage Location (optional)</label>
                  <button onClick={() => { setShowMap(false); setMapCoords(null); }} className="text-[10px] text-muted-foreground hover:text-foreground">
                    Remove
                  </button>
                </div>
                {!MAPBOX_TOKEN ? (
                  <p className="text-[10px] text-muted-foreground bg-muted rounded-lg p-3">Map unavailable — set VITE_MAPBOX_TOKEN to enable. You can still create the stage without a location.</p>
                ) : (
                  <div ref={mapContainerRef} className="w-full h-60 rounded-xl overflow-hidden border border-border" />
                )}
                {mapCoords && (
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Pinned at {mapCoords[1].toFixed(4)}, {mapCoords[0].toFixed(4)}
                  </p>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-[10px] text-destructive">{error}</p>}

          <button
            onClick={handleCreateStage}
            disabled={!newStageName.trim() || creating}
            className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Add Stage</>}
          </button>
        </div>
      )}
    </div>
  );
}
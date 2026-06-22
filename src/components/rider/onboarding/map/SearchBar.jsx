import { useState, useEffect, useRef } from 'react';
import { getCountyCenter, haversineKm } from '@/lib/countyBounds';
import { MapPin, Search, Loader2, X, Plus } from 'lucide-react';

/**
 * Live autocomplete search bar with Mapbox Geocoding API.
 * Shows place name + formatted address + distance from county center.
 * Dropdown includes both existing stage matches and geocoded place suggestions.
 */
export default function SearchBar({
  mapboxToken, countyName, stages, memberCounts, selectedStageId,
  onSelectStage, onSelectPlace,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const countyNameRef = useRef(countyName);
  countyNameRef.current = countyName;

  // Debounced geocoding search
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
        const features = (data.features || []).map(f => ({
          ...f,
          distance_km: haversineKm(center[1], center[0], f.center[1], f.center[0]),
        })).sort((a, b) => a.distance_km - b.distance_km);
        setPlaceResults(features);
      } catch (e) { setPlaceResults([]); }
      setSearching(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, mapboxToken]);

  const showSuggestions = searchQuery.trim().length >= 2;
  const filteredStages = searchQuery.trim()
    ? stages.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : [];

  function handleStage(stage) {
    onSelectStage(stage);
    setSearchQuery('');
  }

  function handlePlace(feature) {
    const nameHint = feature.text || (feature.place_name || '').split(',')[0] || '';
    onSelectPlace(feature);
    setSearchQuery('');
  }

  return (
    <div className="space-y-3">
      {/* Search Input */}
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

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden shadow-sm">
          {filteredStages.map(s => (
            <button key={s.id} onClick={() => handleStage(s)} className="w-full text-left p-3 flex items-center gap-2.5 hover:bg-accent transition-colors">
              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{memberCounts[s.id] || 0} members · Existing stage</p>
              </div>
            </button>
          ))}
          {placeResults.map(f => (
            <button key={f.id} onClick={() => handlePlace(f)} className="w-full text-left p-3 flex items-start gap-2.5 hover:bg-accent transition-colors">
              <Plus className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{f.text}</p>
                <p className="text-[10px] text-muted-foreground truncate">{f.place_name}</p>
                {f.distance_km != null && (
                  <p className="text-[10px] text-blue-500 font-medium mt-0.5">{f.distance_km.toFixed(1)} km from county center</p>
                )}
              </div>
            </button>
          ))}
          {!searching && filteredStages.length === 0 && placeResults.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No results. Try a different search or tap the map to pin a location.</p>
          )}
        </div>
      )}
    </div>
  );
}
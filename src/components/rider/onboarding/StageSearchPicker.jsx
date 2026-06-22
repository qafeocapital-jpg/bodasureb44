import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { isInCounty, getCountyCenter } from '@/lib/countyBounds';
import { Check, AlertTriangle } from 'lucide-react';
import StageMap from '@/components/rider/onboarding/map/StageMap';
import SearchBar from '@/components/rider/onboarding/map/SearchBar';
import CreateStageCard from '@/components/rider/onboarding/map/CreateStageCard';
import StageList from '@/components/rider/onboarding/map/StageList';

export default function StageSearchPicker({ wardId, countyId, countyName, wardName, stages, selectedStageId, onSelect, onStagesChange }) {
  const [mapboxToken, setMapboxToken] = useState('');
  const [mapCoords, setMapCoords] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [geoError, setGeoError] = useState('');
  const [memberCounts, setMemberCounts] = useState({});

  const countyNameRef = useRef(countyName);
  countyNameRef.current = countyName;

  // Fetch Mapbox token immediately on mount
  useEffect(() => {
    base44.functions.invoke('getMapboxToken', {}).then(res => {
      if (res.data?.token) setMapboxToken(res.data.token);
    }).catch(() => {});
  }, []);

  // Use stage.member_count from entity records (avoids fetching all vehicles in ward)
  useEffect(() => {
    if (!wardId) { setMemberCounts({}); return; }
    const counts = {};
    stages.forEach(s => { if (s.id) counts[s.id] = s.member_count || 0; });
    setMemberCounts(counts);
  }, [wardId, stages]);

  // Handle map tap — geo-fence check + drop pin + reverse-geocode + open create card
  async function handleMapClick(coords, geoFenceError) {
    if (geoFenceError) {
      setGeoError(geoFenceError);
      setMapCoords(null);
      setShowCreate(false);
      setTimeout(() => setGeoError(''), 4000);
      return;
    }
    if (!isInCounty(coords[0], coords[1], countyNameRef.current)) {
      setGeoError(`This location is outside your county — please pin within ${countyNameRef.current}.`);
      setMapCoords(null);
      setShowCreate(false);
      setTimeout(() => setGeoError(''), 4000);
      return;
    }
    setGeoError('');
    setMapCoords(coords);
    setShowCreate(true);
    setNewStageName('');

    // Reverse-geocode to auto-populate stage name from nearest POI
    if (mapboxToken && coords) {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${mapboxToken}&types=poi,address,neighborhood,locality,place&limit=1`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          setNewStageName(data.features[0].text || (data.features[0].place_name || '').split(',')[0] || '');
        } else {
          setNewStageName(wardName || '');
        }
      } catch (e) {
        setNewStageName(wardName || '');
      }
    } else {
      setNewStageName(wardName || '');
    }
  }

  async function handleCreateFromSearch(query) {
    const center = getCountyCenter(countyNameRef.current);
    await handleMapClick(center);
    setNewStageName(query);
  }

  async function handleSelectPlace(feature) {
    const nameHint = feature.text || (feature.place_name || '').split(',')[0] || '';
    await handleMapClick(feature.center);
    setNewStageName(nameHint);
  }

  function handleSelectExisting(stage) {
    onSelect(stage.id);
    setShowCreate(false);
    setMapCoords(null);
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
  }

  if (!wardId) {
    return <p className="text-[10px] text-muted-foreground">Select a ward first to see the map.</p>;
  }

  const selectedStage = stages.find(s => s.id === selectedStageId);

  return (
    <div className="space-y-3">
      <SearchBar
        mapboxToken={mapboxToken}
        countyName={countyName}
        stages={stages}
        memberCounts={memberCounts}
        selectedStageId={selectedStageId}
        onSelectStage={handleSelectExisting}
        onSelectPlace={handleSelectPlace}
        onCreateEscape={handleCreateFromSearch}
      />

      <StageMap
        wardId={wardId}
        countyName={countyName}
        stages={stages}
        selectedStageId={selectedStageId}
        memberCounts={memberCounts}
        mapCoords={mapCoords}
        mapboxToken={mapboxToken}
        onMapClick={handleMapClick}
        onSelectStage={handleSelectExisting}
      />

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

      {!showCreate && (
        <StageList
          stages={stages}
          memberCounts={memberCounts}
          selectedStageId={selectedStageId}
          onSelect={handleSelectExisting}
        />
      )}

      {showCreate && (
        <CreateStageCard
          newStageName={newStageName}
          setNewStageName={setNewStageName}
          mapCoords={mapCoords}
          creating={creating}
          error={error}
          onCreate={handleCreateStage}
          onClose={resetCreate}
        />
      )}
    </div>
  );
}
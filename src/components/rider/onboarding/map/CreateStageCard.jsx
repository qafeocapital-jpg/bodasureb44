import { Loader2, Plus, X, MapPin } from 'lucide-react';

/**
 * Inline create-stage card shown after pinning a location.
 * Pre-filled with place name hint from geocoding.
 */
export default function CreateStageCard({
  newStageName, setNewStageName, mapCoords, creating, error, onCreate, onClose,
}) {
  return (
    <div className="bg-accent rounded-xl p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm font-heading font-bold">Create New Stage</p>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
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
        onClick={onCreate}
        disabled={!newStageName.trim() || creating}
        className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50"
      >
        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Create stage here</>}
      </button>
    </div>
  );
}
import { MapPin, Check } from 'lucide-react';

/**
 * Scrollable list of existing stages in the selected ward with member counts.
 */
export default function StageList({ stages, memberCounts, selectedStageId, onSelect }) {
  if (!stages || stages.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">Stages in this ward</p>
      <div className="space-y-1.5">
        {stages.map(s => {
          const isSelected = selectedStageId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={`w-full text-left p-3 rounded-xl border-2 transition-colors flex items-center justify-between ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}
            >
              <div className="flex items-center gap-2">
                <MapPin className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground">{memberCounts[s.id] || 0} members</p>
                </div>
              </div>
              {isSelected && <Check className="w-4 h-4 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
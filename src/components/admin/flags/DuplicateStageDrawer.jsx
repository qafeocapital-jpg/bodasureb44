import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Layers, Users, Calendar, MapPin, Loader2, GitMerge, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/format';

export default function DuplicateStageDrawer({ open, onOpenChange, stageA, stageB, onMerged, onDismiss }) {
  const { toast } = useToast();
  const [wardMap, setWardMap] = useState({});
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!open || !stageA || !stageB) return;
    const wardIds = [stageA.ward_id, stageB.ward_id].filter(Boolean);
    if (wardIds.length === 0) return;
    Promise.all(
      wardIds.map((id) =>
        base44.entities.Ward.filter({ id }).then((r) => r[0] || null).catch(() => null)
      )
    ).then((wards) => {
      const map = {};
      wards.forEach((w) => {
        if (w) map[w.id] = w;
      });
      setWardMap(map);
    });
  }, [open, stageA, stageB]);

  if (!stageA || !stageB) return null;

  async function handleMerge() {
    setMerging(true);
    try {
      const vehicles = await base44.entities.Vehicle.filter({ stage_id: stageB.id });
      if (vehicles.length > 0) {
        await base44.entities.Vehicle.bulkUpdate(
          vehicles.map((v) => ({ id: v.id, stage_id: stageA.id }))
        );
      }
      await base44.entities.Stage.delete(stageB.id);
      toast({
        title: 'Stages merged',
        description: `${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''} reassigned to "${stageA.name}".`,
      });
      if (onMerged) onMerged();
    } catch (e) {
      toast({ title: 'Merge failed', description: e.message, variant: 'destructive' });
    }
    setMerging(false);
  }

  function handleKeepBoth() {
    if (onDismiss) onDismiss(stageA.id, stageB.id);
  }

  function StageCard({ stage, label }) {
    const ward = wardMap[stage.ward_id];
    return (
      <div className="flex-1 bg-card border border-border rounded-xl p-4 space-y-2">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {label}
        </span>
        <p className="text-sm font-bold break-words">{stage.name}</p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3" /> {stage.member_count || 0} members
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" /> {formatDate(stage.created_date)}
          </div>
          {ward && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> {ward.name}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="text-lg font-heading font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Duplicate Stages
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            These two stages have very similar names in the same county. Choose an action below.
          </p>
          <div className="flex gap-3">
            <StageCard stage={stageA} label="Stage A" />
            <StageCard stage={stageB} label="Stage B" />
          </div>
          <div className="space-y-2 pt-2 border-t border-border">
            <button
              onClick={handleMerge}
              disabled={merging}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {merging ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
              Merge into "{stageA.name}"
            </button>
            <p className="text-[10px] text-muted-foreground text-center">
              All vehicles from Stage B will be reassigned to Stage A, and Stage B will be deleted.
            </p>
            <button
              onClick={handleKeepBoth}
              disabled={merging}
              className="w-full border border-border text-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Keep Both
            </button>
            <p className="text-[10px] text-muted-foreground text-center">
              Dismiss this duplicate flag for this session.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
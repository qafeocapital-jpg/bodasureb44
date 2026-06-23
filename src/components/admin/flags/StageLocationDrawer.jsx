import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MapPin, AlertTriangle, Loader2, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function StageLocationDrawer({ open, onOpenChange, stage, countyName, distance, onResolved }) {
  const { toast } = useToast();
  const [counties, setCounties] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapboxToken, setMapboxToken] = useState('');

  useEffect(() => {
    if (!open) return;
    base44.entities.County.list().then(setCounties).catch(() => {});
    base44.functions
      .invoke('getMapboxToken', {})
      .then((res) => {
        const data = res.data;
        const token = typeof data === 'string' ? data : data?.token || data?.access_token || '';
        setMapboxToken(token);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open || !stage) return;
    setSelectedCounty(stage.county_id || '');
    setSelectedWard(stage.ward_id || '');
    if (stage.county_id) {
      base44.entities.Ward.filter({ county_id: stage.county_id }).then(setWards).catch(() => {});
    }
  }, [open, stage]);

  useEffect(() => {
    if (!selectedCounty) return;
    base44.entities.Ward.filter({ county_id: selectedCounty }).then(setWards).catch(() => {});
    setSelectedWard('');
  }, [selectedCounty]);

  if (!stage) return null;

  const hasCoords = stage.location_lat != null && stage.location_lng != null;
  const staticMapUrl =
    mapboxToken && hasCoords
      ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ea580c(${stage.location_lng},${stage.location_lat})/${stage.location_lng},${stage.location_lat},14,0/400x200@2x?access_token=${mapboxToken}`
      : null;

  async function handleReassign() {
    if (!selectedCounty) {
      toast({ title: 'Select a county', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await base44.entities.Stage.update(stage.id, {
        county_id: selectedCounty,
        ward_id: selectedWard || null,
        location_flagged: false,
        needs_review: false,
      });
      toast({ title: 'Stage reassigned', description: `${stage.name} moved to new county/ward.` });
      if (onResolved) onResolved();
    } catch (e) {
      toast({ title: 'Failed to reassign', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  }

  async function handleFlagForRider() {
    setLoading(true);
    try {
      await base44.entities.Stage.update(stage.id, {
        needs_review: true,
        location_flagged: false,
      });
      toast({
        title: 'Flagged for rider',
        description: `${stage.name} will be flagged for the rider to re-select.`,
      });
      if (onResolved) onResolved();
    } catch (e) {
      toast({ title: 'Failed to flag', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="text-lg font-heading font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            {stage.name}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700">Location Anomaly</p>
              <p className="text-xs text-amber-600">
                {distance > 0
                  ? `${Math.round(distance)} km from ${countyName || 'county'} centre`
                  : 'Flagged location'}
              </p>
            </div>
          </div>

          {staticMapUrl ? (
            <img
              src={staticMapUrl}
              alt="Stage location"
              className="w-full rounded-xl border border-border"
            />
          ) : (
            <div className="w-full h-48 rounded-xl bg-muted flex items-center justify-center">
              <MapPin className="w-8 h-8 text-muted-foreground/40" />
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Reassign to different county/ward</h3>
            <div>
              <label className="text-xs text-muted-foreground">County</label>
              <select
                value={selectedCounty}
                onChange={(e) => setSelectedCounty(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
              >
                <option value="">Select county...</option>
                {counties.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ward</label>
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
              >
                <option value="">Select ward...</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleReassign}
              disabled={loading || !selectedCounty}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Reassign Stage
            </button>
          </div>

          <div className="pt-2 border-t border-border">
            <button
              onClick={handleFlagForRider}
              disabled={loading}
              className="w-full border border-amber-500 text-amber-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-amber-50 disabled:opacity-50"
            >
              Flag for Rider to Fix
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
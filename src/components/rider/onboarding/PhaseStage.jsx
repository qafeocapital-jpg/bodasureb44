import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronRight, ChevronLeft, Loader2, MapPin, Users } from 'lucide-react';

export default function PhaseStage({ user, vehicle, onSaved, onBack }) {
  const [stage, setStage] = useState(null);
  const [ward, setWard] = useState(null);
  const [subCounty, setSubCounty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!vehicle?.stage_id) { setLoading(false); return; }
      try {
        const stages = await base44.entities.Stage.filter({ id: vehicle.stage_id });
        if (stages[0]) {
          const s = stages[0];
          setStage(s);
          if (s.ward_id) {
            const wards = await base44.entities.Ward.filter({ id: s.ward_id });
            if (wards[0]) {
              setWard(wards[0]);
              if (wards[0].sub_county_id) {
                const subs = await base44.entities.SubCounty.filter({ id: wards[0].sub_county_id });
                if (subs[0]) setSubCounty(subs[0]);
              }
            }
          }
        }
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [vehicle]);

  async function handleConfirm() {
    setSaving(true);
    try {
      await base44.auth.updateMe({ stage_id: vehicle.stage_id, profile_complete: true });
      await onSaved();
    } catch (e) {}
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!stage) {
    return (
      <div className="bg-accent rounded-2xl p-6 text-center">
        <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-4">No stage mapped to your bike yet. Go back and map your bike first.</p>
        <button onClick={onBack} className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold">Map Bike</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Your bike has been mapped to this stage. Confirm to join.</p>

      {/* Blue gradient stage card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-5 h-5" />
          <p className="font-heading font-bold text-lg">{stage.name}</p>
        </div>
        <p className="text-xs text-blue-100">
          {[subCounty?.name, ward?.name].filter(Boolean).join(', ') || 'Stage gathering point'}
        </p>
        <div className="flex items-center gap-2 mt-3 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 w-fit">
          <Users className="w-4 h-4" />
          <span className="text-xs font-medium">{stage.member_count || 0} members</span>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onBack} className="flex items-center justify-center px-5 py-3 rounded-xl border border-border text-sm font-semibold">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Confirm & Join Stage <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}
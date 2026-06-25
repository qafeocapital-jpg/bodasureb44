import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronRight, ChevronLeft, Loader2, MapPin, AlertTriangle } from 'lucide-react';
import MapCountyConfirmation from '@/components/rider/onboarding/MapCountyConfirmation';
import { ReadOnlyBanner, ReadOnlyBackButton } from '@/components/rider/onboarding/ReadOnlyBanner';

export default function PhaseMapBike({ user, vehicle, initialValues, onDraftChange, onSaved, onBack, readOnly, onExitReadOnly }) {
  const [county, setCounty] = useState(null);
  const [subCounties, setSubCounties] = useState([]);
  const [wards, setWards] = useState([]);
  const [form, setForm] = useState({
    sub_county_id: initialValues?.sub_county_id || '',
    ward_id: initialValues?.ward_id || '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const updateForm = (partial) => {
    const next = { ...form, ...partial };
    setForm(next);
    onDraftChange?.(next);
  };
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user?.county_id) return;
      try {
        const [c, subs] = await Promise.all([
          base44.entities.County.get(user.county_id),
          base44.entities.SubCounty.filter({ county_id: user.county_id }),
        ]);
        setCounty(c);
        setSubCounties(subs);
        if (vehicle?.sub_county_id) {
          const ws = await base44.entities.Ward.filter({ sub_county_id: vehicle.sub_county_id });
          setWards(ws);
        }
      } catch (e) {}
    }
    load();
  }, [user, vehicle]);

  async function handleSubCountyChange(subCountyId) {
    updateForm({ sub_county_id: subCountyId, ward_id: '' });
    setWards([]);
    if (subCountyId) {
      const ws = await base44.entities.Ward.filter({ sub_county_id: subCountyId });
      setWards(ws);
    }
  }

  async function handleWardChange(wardId) {
    updateForm({ ward_id: wardId });
  }

  const canProceed = () => form.sub_county_id && form.ward_id;

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      await base44.entities.Vehicle.update(vehicle.id, {
        sub_county_id: form.sub_county_id,
        ward_id: form.ward_id,
      });
      setShowConfirmation(true);
    } catch (e) {
      setSaveError(e.message || 'Failed to save mapping. Please try again.');
    }
    setSaving(false);
  }

  if (!vehicle) {
    return (
      <div className="bg-accent rounded-2xl p-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">No bike registered yet. Go back and register one first.</p>
        <button onClick={onBack} className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold">Register Bike</button>
      </div>
    );
  }

  if (showConfirmation) {
    const subCounty = subCounties.find(s => s.id === form.sub_county_id);
    const ward = wards.find(w => w.id === form.ward_id);
    return (
      <MapCountyConfirmation
        user={user}
        vehicle={vehicle}
        county={county}
        subCounty={subCounty}
        ward={ward}
        onContinue={onSaved}
        onBack={() => setShowConfirmation(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {readOnly && <ReadOnlyBanner />}
      <div className={`space-y-4 ${readOnly ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Read-only county chip */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-primary">{county?.name || 'Your County'} 📍</p>
          <p className="text-[10px] text-muted-foreground">Based on your profile</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Sub-County</label>
        <select
          value={form.sub_county_id}
          onChange={e => handleSubCountyChange(e.target.value)}
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select sub-county</option>
          {subCounties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Ward</label>
        <select
          value={form.ward_id}
          onChange={e => handleWardChange(e.target.value)}
          disabled={!form.sub_county_id}
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        >
          <option value="">Select ward</option>
          {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {saveError && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{saveError}</p>
        </div>
      )}

      </div>
      {!readOnly && (
      <div className="flex gap-2 pt-2">
        <button onClick={onBack} className="flex items-center justify-center px-5 py-3 rounded-xl border border-border text-sm font-semibold">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={handleSave}
          disabled={!canProceed() || saving}
          className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save & Continue <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
      )}
      {readOnly && <ReadOnlyBackButton onExit={onExitReadOnly} />}
    </div>
  );
}
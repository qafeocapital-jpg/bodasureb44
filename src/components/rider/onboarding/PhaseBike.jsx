import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizePhone, isValidKenyanPhone } from '@/lib/phone';
import { auditLog } from '@/lib/audit';
import { ChevronRight, ChevronLeft, Loader2, Check, MapPin, Lock, AlertTriangle } from 'lucide-react';

export default function PhaseBike({ user, counties, vehicle, initialValues, onDraftChange, onSaved, onBack }) {
  const [form, setForm] = useState({
    role: initialValues?.role || 'rider',
    plate_number: initialValues?.plate_number || '',
    make: initialValues?.make || '',
    color: initialValues?.color || '',
    year: initialValues?.year || '',
    is_owner_rider: initialValues?.is_owner_rider ?? true,
    owner_phone: initialValues?.owner_phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [ownerFound, setOwnerFound] = useState(null);
  const [ownerFoundName, setOwnerFoundName] = useState('');
  const [ownerPhoneError, setOwnerPhoneError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [plateError, setPlateError] = useState('');

  const updateForm = (partial) => {
    const next = { ...form, ...partial };
    setForm(next);
    onDraftChange?.(next);
  };

  const isOwnerRole = form.role === 'owner' || form.role === 'owner_rider';

  function validateOwnerPhone() {
    if (form.role !== 'rider') { setOwnerPhoneError(''); return; }
    const phone = form.owner_phone?.trim();
    if (!phone) { setOwnerPhoneError(''); return; }
    const normalized = normalizePhone(phone);
    if (!normalized || !isValidKenyanPhone(phone)) {
      setOwnerPhoneError('Enter a valid Kenyan phone number');
      return;
    }
    if (normalized === normalizePhone(user.phone)) {
      setOwnerPhoneError("Enter the bike owner's phone — it cannot be the same as yours");
      return;
    }
    setOwnerPhoneError('');
  }

  async function handleOwnerPhoneBlur() {
    validateOwnerPhone();
    if (form.role !== 'rider' || !form.owner_phone?.trim()) return;
    const normalized = normalizePhone(form.owner_phone);
    if (!normalized || normalized === normalizePhone(user.phone)) return;
    try {
      const owners = await base44.entities.User.filter({ phone: normalized });
      setOwnerFound(owners.length > 0);
      setOwnerFoundName(owners[0]?.full_name);
    } catch (e) { setOwnerFound(false); }
  }

  const canProceed = () => {
    if (!form.role || !form.plate_number?.trim() || !form.make?.trim() || !form.color?.trim()) return false;
    if (form.role === 'rider' && (!form.owner_phone?.trim() || ownerPhoneError)) return false;
    return true;
  };

  async function checkPlateUniqueness() {
    const plate = form.plate_number?.trim().toUpperCase();
    if (!plate) { setPlateError(''); return false; }
    if (vehicle?.plate_number?.toUpperCase() === plate) { setPlateError(''); return false; }
    try {
      const existing = await base44.entities.Vehicle.filter({ plate_number: plate });
      if (existing.length > 0 && existing[0].id !== vehicle?.id) {
        setPlateError('This plate is already registered.');
        return true;
      }
      setPlateError('');
      return false;
    } catch (e) { setPlateError(''); return false; }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    setPlateError('');
    try {
      const isOwner = form.role === 'owner' || form.role === 'owner_rider';
      if (!isOwner) {
        const normalized = normalizePhone(form.owner_phone);
        if (!normalized || !isValidKenyanPhone(form.owner_phone) || normalized === normalizePhone(user.phone)) {
          setOwnerPhoneError("Enter the bike owner's phone — it cannot be the same as yours");
          setSaving(false);
          return;
        }
      }
      // Check plate uniqueness
      const plateTaken = await checkPlateUniqueness();
      if (plateTaken) { setSaving(false); return; }
      let ownerId = isOwner ? user.id : null;
      if (!isOwner && form.owner_phone) {
        const normalized = normalizePhone(form.owner_phone);
        if (normalized) {
          const owners = await base44.entities.User.filter({ phone: normalized });
          if (owners.length > 0) ownerId = owners[0].id;
        }
      }
      const vehicleData = {
        plate_number: form.plate_number.toUpperCase(),
        make: form.make,
        color: form.color,
        year: form.year ? parseInt(form.year) : null,
        owner_id: ownerId,
        rider_id: user.id,
        county_id: user.county_id,
        is_owner_rider: isOwner,
      };
      let savedVehicle;
      if (vehicle?.id) {
        savedVehicle = await base44.entities.Vehicle.update(vehicle.id, vehicleData);
      } else {
        savedVehicle = await base44.entities.Vehicle.create({ ...vehicleData, status: 'pending' });
        await auditLog({
          userId: user.id,
          action: 'vehicle_registered',
          entityType: 'Vehicle',
          entityId: savedVehicle.id,
          description: `Vehicle ${form.plate_number.toUpperCase()} registered during onboarding`,
        });
      }
      await onSaved();
    } catch (e) {
      setSaveError(e.message || 'Failed to register bike. Please try again.');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {user.county_id && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-primary">{counties?.find(c => c.id === user.county_id)?.name || 'Your County'} 📍</p>
            <p className="text-[10px] text-muted-foreground">Auto-filled from Phase 1 — your bike will be registered here</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {[
          { val: 'rider', label: 'I ride this bike', desc: 'Someone else owns it' },
          { val: 'owner_rider', label: 'I own and ride', desc: 'I am both owner and rider' },
          { val: 'owner', label: 'I own this bike', desc: 'Someone else rides it' },
        ].map(opt => (
          <button
            key={opt.val}
            onClick={() => {
              const isOwner = opt.val === 'owner' || opt.val === 'owner_rider';
              updateForm({
                role: opt.val,
                is_owner_rider: opt.val === 'owner_rider',
                owner_phone: isOwner ? (normalizePhone(user.phone) || user.phone || '') : '',
              });
              setOwnerFound(null);
              setOwnerPhoneError('');
            }}
            className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${form.role === opt.val ? 'border-primary bg-primary/5' : 'border-border'}`}
          >
            <p className="text-sm font-semibold">{opt.label}</p>
            <p className="text-xs text-muted-foreground">{opt.desc}</p>
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Plate Number</label>
        <input
          type="text"
          value={form.plate_number}
          onChange={e => updateForm({ plate_number: e.target.value })}
          placeholder="KMEA 123A"
          className={`w-full mt-1 px-3 py-2.5 rounded-xl border bg-background text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary ${plateError ? 'border-destructive' : 'border-input'}`}
        />
        {plateError && <p className="text-xs text-destructive mt-1">{plateError}</p>}
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Make</label>
        <input
          type="text"
          value={form.make}
          onChange={e => updateForm({ make: e.target.value })}
          placeholder="Honda, Yamaha, TVS..."
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground">Color</label>
          <input
            type="text"
            value={form.color}
            onChange={e => updateForm({ color: e.target.value })}
            placeholder="Black"
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="w-24">
          <label className="text-xs font-medium text-muted-foreground">Year <span className="text-muted-foreground/60">(Optional)</span></label>
          <input
            type="number"
            value={form.year}
            onChange={e => updateForm({ year: e.target.value })}
            placeholder="2021"
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Owner Phone
          {!isOwnerRole && <span className="text-destructive ml-0.5">*</span>}
        </label>
        {isOwnerRole ? (
          <div className="relative mt-1">
            <input
              type="tel"
              value={normalizePhone(user.phone) || user.phone || ''}
              readOnly
              className="w-full px-3 py-2.5 pr-10 rounded-xl border border-input bg-muted text-sm text-muted-foreground cursor-not-allowed"
            />
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        ) : (
          <>
            <input
              type="tel"
              value={form.owner_phone}
              onChange={e => { updateForm({ owner_phone: e.target.value }); setOwnerFound(null); setOwnerPhoneError(''); }}
              onBlur={handleOwnerPhoneBlur}
              placeholder="07XX XXX XXX"
              className={`w-full mt-1 px-3 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary ${ownerPhoneError ? 'border-destructive' : 'border-input'}`}
            />
            {ownerPhoneError && (
              <p className="text-xs text-destructive mt-1">{ownerPhoneError}</p>
            )}
            {ownerFound === true && !ownerPhoneError && (
              <p className="text-[10px] text-success mt-1 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" /> Owner found: {ownerFoundName}
              </p>
            )}
            {ownerFound === false && form.owner_phone && !ownerPhoneError && (
              <p className="text-[10px] text-muted-foreground mt-1">Owner not found — they'll be linked when they register.</p>
            )}
          </>
        )}
        {isOwnerRole && (
          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <Check className="w-3 h-3 text-success" /> Auto-filled — you are the owner
          </p>
        )}
      </div>

      {saveError && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{saveError}</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={onBack} className="flex items-center justify-center px-5 py-3 rounded-xl border border-border text-sm font-semibold">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={handleSave}
          disabled={!canProceed() || saving}
          className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Register Bike <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}
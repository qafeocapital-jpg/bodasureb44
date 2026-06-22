import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizePhone } from '@/lib/phone';
import { auditLog } from '@/lib/audit';
import { ChevronRight, ChevronLeft, Loader2, Check, MapPin } from 'lucide-react';

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

  const updateForm = (partial) => {
    const next = { ...form, ...partial };
    setForm(next);
    onDraftChange?.(next);
  };

  const canProceed = () => form.role && form.plate_number?.trim() && form.make?.trim() && form.color?.trim();

  async function handleSave() {
    setSaving(true);
    try {
      const isOwner = form.role === 'owner' || form.role === 'owner_rider';
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
    } catch (e) {}
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
            onClick={() => updateForm({ role: opt.val, is_owner_rider: opt.val === 'owner_rider' })}
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
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary"
        />
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

      {!form.is_owner_rider && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Owner Phone</label>
          <input
            type="tel"
            value={form.owner_phone}
            onChange={e => { updateForm({ owner_phone: e.target.value }); setOwnerFound(null); }}
            onBlur={async () => {
              if (!form.owner_phone) return;
              const normalized = normalizePhone(form.owner_phone);
              if (!normalized) { setOwnerFound(false); return; }
              try {
                const owners = await base44.entities.User.filter({ phone: normalized });
                setOwnerFound(owners.length > 0);
                setOwnerFoundName(owners[0]?.full_name);
              } catch (e) { setOwnerFound(false); }
            }}
            placeholder="07XX XXX XXX"
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {ownerFound === true && (
            <p className="text-[10px] text-success mt-1 font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> Owner found: {ownerFoundName}
            </p>
          )}
          {ownerFound === false && form.owner_phone && (
            <p className="text-[10px] text-muted-foreground mt-1">Owner not found — they'll be linked when they register.</p>
          )}
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
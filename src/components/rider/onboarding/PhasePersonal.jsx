import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { normalizePhone, isValidKenyanPhone } from '@/lib/phone';
import PhoneInput from '@/components/ui/PhoneInput';
import { ChevronRight, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import { ReadOnlyBanner, ReadOnlyBackButton } from '@/components/rider/onboarding/ReadOnlyBanner';

export default function PhasePersonal({ user, counties, initialValues, onDraftChange, onSaved, onBack, readOnly, onExitReadOnly }) {
  const [form, setForm] = useState({
    full_name: initialValues?.full_name || '',
    phone: initialValues?.phone || '',
    national_id: initialValues?.national_id || '',
    county_id: initialValues?.county_id || '',
  });
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [idError, setIdError] = useState('');
  const [saveError, setSaveError] = useState('');

  const updateForm = (partial) => {
    const next = { ...form, ...partial };
    setForm(next);
    onDraftChange?.(next);
  };

  const isNationalIdValid = (id) => /^\d{7,8}$/.test((id || '').trim());

  const canProceed = () =>
    form.full_name?.trim() &&
    isValidKenyanPhone(form.phone) &&
    isNationalIdValid(form.national_id) &&
    form.county_id;

  async function checkPhoneUniqueness() {
    if (!form.phone || !isValidKenyanPhone(form.phone)) { setPhoneError(''); return false; }
    if (form.phone === normalizePhone(user?.phone)) { setPhoneError(''); return false; }
    try {
      const existing = await base44.entities.User.filter({ phone: form.phone });
      if (existing.length > 0 && existing[0].id !== user?.id) {
        setPhoneError('This phone is already registered.');
        return true;
      }
      setPhoneError('');
      return false;
    } catch (e) { setPhoneError(''); return false; }
  }

  async function checkIdUniqueness() {
    const id = (form.national_id || '').trim();
    if (!id || !isNationalIdValid(id)) { setIdError(''); return false; }
    if (id === user?.national_id) { setIdError(''); return false; }
    try {
      const existing = await base44.entities.User.filter({ national_id: id });
      if (existing.length > 0 && existing[0].id !== user?.id) {
        setIdError('This ID is already registered.');
        return true;
      }
      setIdError('');
      return false;
    } catch (e) { setIdError(''); return false; }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      const phoneTaken = await checkPhoneUniqueness();
      const idTaken = await checkIdUniqueness();
      if (phoneTaken || idTaken) { setSaving(false); return; }
      await base44.auth.updateMe({
        full_name: form.full_name.trim(),
        phone: form.phone,
        national_id: form.national_id.trim(),
        county_id: form.county_id,
      });
      await onSaved();
    } catch (e) {
      setSaveError(e.message || 'Failed to save profile. Please try again.');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {readOnly && <ReadOnlyBanner />}
      <div className={`space-y-4 ${readOnly ? 'opacity-60 pointer-events-none' : ''}`}>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Full Name</label>
        <input
          type="text"
          value={form.full_name}
          onChange={e => updateForm({ full_name: e.target.value })}
          placeholder="John Mwangi"
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <PhoneInput
        value={form.phone}
        onChange={(e164) => updateForm({ phone: e164 })}
        onBlur={checkPhoneUniqueness}
        error={phoneError}
      />
      <div>
        <label className="text-xs font-medium text-muted-foreground">National ID Number</label>
        <input
          type="text"
          inputMode="numeric"
          value={form.national_id}
          onChange={e => updateForm({ national_id: e.target.value.replace(/[^\d]/g, '') })}
          onBlur={checkIdUniqueness}
          placeholder="00000000"
          maxLength={8}
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {idError && <p className="text-xs text-destructive mt-1">{idError}</p>}
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">County You Operate From</label>
        <select
          value={form.county_id}
          onChange={e => updateForm({ county_id: e.target.value })}
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select county</option>
          {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <p className="text-[10px] text-muted-foreground mt-1.5">This determines your fee schedules and compliance scoping.</p>
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
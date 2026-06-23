import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { splitFullName, joinFullName } from '@/lib/nameUtils';
import { base44 } from '@/api/base44Client';
import { normalizePhone, isValidKenyanPhone } from '@/lib/phone';
import PhoneInput from '@/components/ui/PhoneInput';
import { ChevronRight, ChevronLeft, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ReadOnlyBanner, ReadOnlyBackButton } from '@/components/rider/onboarding/ReadOnlyBanner';

export default function PhasePersonal({ user, counties, initialValues, onDraftChange, onSaved, onBack, readOnly, onExitReadOnly }) {
  const { refreshUser } = useAuth();
  const nameParts = splitFullName(initialValues?.full_name || user?.full_name || '');
  const [form, setForm] = useState({
    full_name: initialValues?.full_name || '',
    firstName: nameParts.firstName,
    middleName: nameParts.middleName,
    lastName: nameParts.lastName,
    phone: initialValues?.phone || '',
    national_id: initialValues?.national_id || '',
    county_id: initialValues?.county_id || '',
  });
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [idError, setIdError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [idVerified, setIdVerified] = useState(false);
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [idChecking, setIdChecking] = useState(false);

  const updateName = (partial) => {
    const next = { ...form, ...partial };
    next.full_name = joinFullName(next.firstName, next.middleName, next.lastName);
    setForm(next);
    onDraftChange?.(next);
  };

  const updateForm = (partial) => {
    const next = { ...form, ...partial };
    setForm(next);
    onDraftChange?.(next);
  };

  const isNationalIdFormatValid = (id) => /^\d{6,8}$/.test((id || '').trim());
  const isPhoneFormatValid = (phone) => isValidKenyanPhone(phone);

  const canProceed = () =>
    form.firstName?.trim() &&
    form.lastName?.trim() &&
    isPhoneFormatValid(form.phone) &&
    isNationalIdFormatValid(form.national_id) &&
    form.county_id;

  function checkPhoneFormatError() {
    if (!form.phone) { setPhoneError(''); return false; }
    if (!isPhoneFormatValid(form.phone)) {
      setPhoneError('Phone must be a valid Kenyan number (07XX or 01XX)');
      setPhoneVerified(false);
      return true;
    }
    setPhoneError('');
    return false;
  }

  function checkIdFormatError() {
    if (!form.national_id) { setIdError(''); return false; }
    if (!isNationalIdFormatValid(form.national_id)) {
      setIdError('National ID must be 6–8 digits');
      setIdVerified(false);
      return true;
    }
    setIdError('');
    return false;
  }

  async function checkPhoneUniqueness() {
    if (phoneChecking) return false;
    setPhoneVerified(false);
    if (!form.phone || !isPhoneFormatValid(form.phone)) { setPhoneError(''); return false; }
    if (form.phone === normalizePhone(user?.phone)) { setPhoneError(''); setPhoneVerified(true); return false; }
    setPhoneChecking(true);
    try {
      const existing = await base44.entities.User.filter({ phone: form.phone });
      if (existing.length > 0 && existing[0].id !== user?.id) {
        setPhoneError('This phone number is already registered to another BodaSure account');
        return true;
      }
      setPhoneError('');
      setPhoneVerified(true);
      return false;
    } catch (e) { setPhoneError(''); return false; }
    finally { setPhoneChecking(false); }
  }

  async function checkIdUniqueness() {
    if (idChecking) return false;
    setIdVerified(false);
    const id = (form.national_id || '').trim();
    if (!id || !isNationalIdFormatValid(id)) { setIdError(''); return false; }
    if (id === user?.national_id) { setIdError(''); setIdVerified(true); return false; }
    setIdChecking(true);
    try {
      const existing = await base44.entities.User.filter({ national_id: id });
      if (existing.length > 0 && existing[0].id !== user?.id) {
        setIdError('This National ID is already linked to another account — please verify your details');
        return true;
      }
      setIdError('');
      setIdVerified(true);
      return false;
    } catch (e) { setIdError(''); return false; }
    finally { setIdChecking(false); }
  }

  async function handleSave() {
    // Force format validation even if onBlur didn't trigger
    if (checkPhoneFormatError() || checkIdFormatError()) {
      return;
    }
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
      await refreshUser();
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
            <label className="text-xs font-medium text-muted-foreground">First Name</label>
            <input
              type="text"
              value={form.firstName}
              onChange={e => updateName({ firstName: e.target.value })}
              placeholder="John"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Middle Name <span className="text-muted-foreground/60">(optional)</span></label>
            <input
              type="text"
              value={form.middleName}
              onChange={e => updateName({ middleName: e.target.value })}
              placeholder="Kimeu"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Last Name</label>
            <input
              type="text"
              value={form.lastName}
              onChange={e => updateName({ lastName: e.target.value })}
              placeholder="Omondi"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
        <PhoneInput
          value={form.phone}
          onChange={(e164) => { updateForm({ phone: e164 }); checkPhoneFormatError(); setPhoneVerified(false); }}
          onBlur={checkPhoneUniqueness}
          error={phoneError}
        />
        {phoneVerified && <p className="text-xs text-success mt-1 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Phone verified</p>}
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">National ID Number</label>
        <input
          type="text"
          inputMode="numeric"
          value={form.national_id}
          onChange={e => { updateForm({ national_id: e.target.value.replace(/[^\d]/g, '') }); checkIdFormatError(); setIdVerified(false); }}
          onBlur={checkIdUniqueness}
          placeholder="00000000"
          maxLength={8}
          className={`w-full mt-1 px-3 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary ${idError ? 'border-destructive' : 'border-input'}`}
        />
        {idError && <p className="text-xs text-destructive mt-1">{idError}</p>}
        {idVerified && <p className="text-xs text-success mt-1 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> ID verified</p>}
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
// Step 0: Profile details form with phone/ID uniqueness checks and wallet activation
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { splitFullName, joinFullName } from '@/lib/nameUtils';
import { base44 } from '@/api/base44Client';
import { normalizePhone, isValidKenyanPhone } from '@/lib/phone';
import PhoneInput from '@/components/ui/PhoneInput';
import { ChevronRight, ChevronLeft, Loader2, AlertTriangle, CheckCircle2, Check, Smartphone } from 'lucide-react';

export default function PhasePersonalForm({ user, counties, form, setForm, onDraftChange, onWalletInitiated, onBack }) {
  const { refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [idError, setIdError] = useState('');
  const [walletError, setWalletError] = useState('');
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

  const canProceedForm = () =>
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
      const res = await base44.functions.invoke('checkPhoneUniqueness', { phone: form.phone });
      if (res.status === 429) {
        setPhoneError('Too many checks. Please try again in a moment.');
        return false;
      }
      if (res.data?.conflict) {
        setPhoneError('This phone number is already in use. Please try a different one.');
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
      const res = await base44.functions.invoke('checkNationalIdUniqueness', { national_id: id });
      if (res.status === 429) {
        setIdError('Too many checks. Please try again in a moment.');
        return false;
      }
      if (res.data?.conflict) {
        setIdError('This ID number is already in use. Please verify your details.');
        return true;
      }
      setIdError('');
      setIdVerified(true);
      return false;
    } catch (e) { setIdError(''); return false; }
    finally { setIdChecking(false); }
  }

  async function handleInitWallet() {
    if (checkPhoneFormatError() || checkIdFormatError()) return;
    setSaving(true);
    setWalletError('');
    try {
      const phoneTaken = await checkPhoneUniqueness();
      const idTaken = await checkIdUniqueness();
      if (phoneTaken || idTaken) { setSaving(false); return; }

      await base44.auth.updateMe({
        full_name: form.full_name.trim(),
        phone: form.phone,
        national_id: form.national_id.trim(),
        county_id: form.county_id,
        middle_name: form.middleName,
      });
      await refreshUser();

      const res = await base44.functions.invoke('sasapayPersonalOnboarding', { action: 'init' });
      if (!res.data?.success) {
        setWalletError(res.data?.error || 'Failed to activate wallet. Please try again.');
        setSaving(false);
        return;
      }

      if (res.data?.recovered) {
        onWalletInitiated(null); // skip OTP — go straight to PIN
      } else {
        onWalletInitiated(res.data.requestId);
      }
    } catch (e) {
      setWalletError(e.response?.data?.error || e.message || 'Failed to activate wallet.');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="bg-accent rounded-xl p-4 flex items-center gap-3">
        <Smartphone className="w-5 h-5 text-primary flex-shrink-0" />
        <p className="text-sm text-muted-foreground">Complete your profile to activate your BodaSure Wallet</p>
      </div>
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
      </div>
      {walletError && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{walletError}</p>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onBack} className="px-5 py-3 rounded-xl border border-border text-sm font-semibold">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={handleInitWallet}
          disabled={!canProceedForm() || saving}
          className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Activate Wallet <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}
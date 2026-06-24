import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { splitFullName, joinFullName } from '@/lib/nameUtils';
import { base44 } from '@/api/base44Client';
import { normalizePhone, isValidKenyanPhone } from '@/lib/phone';
import PhoneInput from '@/components/ui/PhoneInput';
import { ChevronRight, ChevronLeft, Loader2, AlertTriangle, CheckCircle2, Shield, KeyRound, Check, Smartphone } from 'lucide-react';
import { ReadOnlyBanner, ReadOnlyBackButton } from '@/components/rider/onboarding/ReadOnlyBanner';

export default function PhasePersonal({ user, counties, initialValues, onDraftChange, onSaved, onBack, readOnly, onExitReadOnly }) {
  const { refreshUser } = useAuth();
  const nameParts = splitFullName(initialValues?.full_name || user?.full_name || '');
  
  // Main form state
  const [form, setForm] = useState({
    full_name: initialValues?.full_name || '',
    firstName: nameParts.firstName,
    middleName: nameParts.middleName,
    lastName: nameParts.lastName,
    phone: initialValues?.phone || '',
    national_id: initialValues?.national_id || '',
    county_id: initialValues?.county_id || '',
  });

  // Step tracking
  const [step, setStep] = useState(0); // 0: Details, 1: OTP, 2: PIN, 3: Done
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [idError, setIdError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [walletError, setWalletError] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [idVerified, setIdVerified] = useState(false);
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [idChecking, setIdChecking] = useState(false);
  
  // Wallet activation state
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [requestId, setRequestId] = useState('');

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
      if (res.data?.conflict) {
        setPhoneError('Your phone number is already linked to a BodaSure Wallet. Please enter a different number.');
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
      if (res.data?.conflict) {
        setIdError('This National ID is already linked to a BodaSure Wallet. Please enter a different ID number.');
        return true;
      }
      setIdError('');
      setIdVerified(true);
      return false;
    } catch (e) { setIdError(''); return false; }
    finally { setIdChecking(false); }
  }

  // Step 0: Save profile & initiate wallet activation
  async function handleInitWallet() {
    if (checkPhoneFormatError() || checkIdFormatError()) return;
    setSaving(true);
    setSaveError('');
    setWalletError('');
    try {
      const phoneTaken = await checkPhoneUniqueness();
      const idTaken = await checkIdUniqueness();
      if (phoneTaken || idTaken) { setSaving(false); return; }
      
      // Save profile
      await base44.auth.updateMe({
        full_name: form.full_name.trim(),
        phone: form.phone,
        national_id: form.national_id.trim(),
        county_id: form.county_id,
      });
      await refreshUser();
      
      // Initiate wallet activation
      const res = await base44.functions.invoke('sasapayPersonalOnboarding', { action: 'init' });
      if (res.data?.success) {
        if (res.data?.recovered) {
          // Account recovered — skip OTP, go to PIN
          setStep(2);
        } else {
          setRequestId(res.data.requestId);
          setStep(1); // OTP step
        }
      } else {
        setWalletError(res.data?.error || 'Failed to activate wallet. Please try again.');
      }
    } catch (e) {
      setWalletError(e.response?.data?.error || e.message || 'Failed to activate wallet.');
    }
    setSaving(false);
  }

  // Step 1: Verify OTP
  async function handleConfirmOtp() {
    if (otp.length < 4) { setWalletError('Enter the OTP sent to your phone.'); return; }
    setSaving(true);
    setWalletError('');
    try {
      const res = await base44.functions.invoke('sasapayPersonalOnboarding', {
        action: 'confirm',
        otp,
        requestId,
      });
      if (res.data?.success) {
        await refreshUser();
        setStep(2); // PIN step
      } else {
        setWalletError(res.data?.error || 'Verification failed. Check your code and try again.');
      }
    } catch (e) {
      setWalletError(e.response?.data?.error || e.message || 'Verification failed. Try again.');
    }
    setSaving(false);
  }

  // Step 2: Set PIN
  async function handleSetPin() {
    if (pin.length !== 4) { setWalletError('PIN must be 4 digits.'); return; }
    if (pin !== pinConfirm) { setWalletError('PINs do not match.'); return; }
    setSaving(true);
    setWalletError('');
    try {
      const res = await base44.functions.invoke('setWalletPin', { pin });
      if (res.data?.success) {
        await refreshUser();
        setStep(3); // Done
      } else {
        setWalletError(res.data?.error || 'Failed to set PIN. Try again.');
      }
    } catch (e) {
      setWalletError(e.response?.data?.error || e.message || 'Failed to set PIN.');
    }
    setSaving(false);
  }

  // Step 3: Complete
  async function handleComplete() {
    await onSaved();
  }

  if (readOnly) {
    return (
      <div className="space-y-4">
        <ReadOnlyBanner />
        <div className="space-y-4 opacity-60 pointer-events-none">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="font-medium">{form.firstName} {form.lastName}</p>
            <p className="text-sm text-muted-foreground">{form.phone}</p>
          </div>
        </div>
        <ReadOnlyBackButton onExit={onExitReadOnly} />
      </div>
    );
  }

  const steps = [
    { title: 'Details', icon: Smartphone },
    { title: 'Verify OTP', icon: Shield },
    { title: 'Set PIN', icon: KeyRound },
    { title: 'Done', icon: Check },
  ];

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-6">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-1">Step {step + 1} of {steps.length}</p>
      <h2 className="font-heading font-bold text-lg mb-5">{steps[step].title}</h2>

      {/* Step 0: Profile Details */}
      {step === 0 && (
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
          {(saveError || walletError) && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{saveError || walletError}</p>
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
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}

      {/* Step 1: OTP */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-accent rounded-xl p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-sm text-muted-foreground">An OTP has been sent to your phone</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Enter OTP Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full mt-1 px-3 py-3 rounded-xl border border-input bg-background text-2xl text-center tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {walletError && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{walletError}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setStep(0)} className="px-5 py-3 rounded-xl border border-border text-sm font-semibold">
              Back
            </button>
            <button
              onClick={handleConfirmOtp}
              disabled={saving || otp.length < 4}
              className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: PIN */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-success/10 rounded-xl p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-success flex-shrink-0" />
            <p className="text-sm text-muted-foreground">Now set a 4-digit PIN to secure your wallet</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Create PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full mt-1 px-3 py-3 rounded-xl border border-input bg-background text-2xl text-center tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Confirm PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full mt-1 px-3 py-3 rounded-xl border border-input bg-background text-2xl text-center tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {walletError && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{walletError}</p>
            </div>
          )}
          <button
            onClick={handleSetPin}
            disabled={saving || pin.length !== 4 || pinConfirm.length !== 4}
            className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Set PIN <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="text-center py-8 space-y-4">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-success" />
          </div>
          <h2 className="font-heading font-bold text-xl">Wallet Activated!</h2>
          <p className="text-sm text-muted-foreground">Your BodaSure Wallet is now ready. Let's set up your bike registration.</p>
          <button
            onClick={handleComplete}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm"
          >
            Continue to Bike Registration <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
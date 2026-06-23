import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getOrCreateWallet } from '@/lib/payments';
import { setWalletPin } from '@/lib/pin';
import { auditLog } from '@/lib/audit';
import { splitFullName, joinFullName } from '@/lib/nameUtils';
import { normalizePhone, isValidKenyanPhone, formatPhoneDisplay } from '@/lib/phone';
import PhoneInput from '@/components/ui/PhoneInput';
import CountyPicker from '@/components/rider/CountyPicker';
import { ChevronLeft, ChevronRight, Check, Shield, KeyRound, Loader2, Smartphone, Lock } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';

export default function WalletActivate() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [counties, setCounties] = useState([]);
  const [step, setStep] = useState(0);
  const [identity, setIdentity] = useState({ firstName: '', middleName: '', lastName: '', full_name: '', national_id: '', phone: '', county_id: '' });
  const [otp, setOtp] = useState('');
  const [requestId, setRequestId] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [phoneConflict, setPhoneConflict] = useState(false);
  const [phoneChecking, setPhoneChecking] = useState(false);
  const phoneCheckTimer = useRef(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const nameParts = splitFullName(user.full_name || '');
      setIdentity({
        firstName: nameParts.firstName,
        middleName: nameParts.middleName,
        lastName: nameParts.lastName,
        full_name: user.full_name || '',
        national_id: user.national_id || '',
        phone: user.phone || '',
        county_id: user.county_id || '',
      });
      try {
        const [w, cs] = await Promise.all([
          getOrCreateWallet(user.id),
          base44.entities.County.filter({}).catch(() => []),
        ]);
        setWallet(w);
        if (cs && cs.length > 0) {
          setCounties(cs);
        } else {
          setCounties([]);
          // Don't fail, allow user to proceed but warn them
        }
      } catch (e) {}
    }
    load();
  }, [user]);

  useEffect(() => {
    return () => clearTimeout(phoneCheckTimer.current);
  }, []);

  async function checkPhoneUniqueness(normalized) {
    if (!normalized || !isValidKenyanPhone(normalized)) {
      setPhoneConflict(false);
      setPhoneChecking(false);
      return;
    }
    setPhoneChecking(true);
    try {
      const res = await base44.functions.invoke('checkPhoneUniqueness', { phone: normalized });
      setPhoneConflict(res.data?.conflict === true);
    } catch (e) {
      setPhoneConflict(false);
    }
    setPhoneChecking(false);
  }

  function handlePhoneBlur() {
    const normalized = normalizePhone(identity.phone);
    if (!normalized) {
      setPhoneConflict(false);
      return;
    }
    clearTimeout(phoneCheckTimer.current);
    phoneCheckTimer.current = setTimeout(() => checkPhoneUniqueness(normalized), 400);
  }

  // Step 0: Save profile + call SasaPay personal onboarding init
  async function handleInit() {
    if (!identity.firstName || !identity.lastName || !identity.national_id || !identity.phone || !identity.county_id) {
      setError('First name, last name, phone, National ID, and county are required.');
      return;
    }
    if (!/^\d{6,8}$/.test(identity.national_id)) {
      setError('National ID must be 6–8 digits.');
      return;
    }
    const normalizedPhone = normalizePhone(identity.phone);
    if (!normalizedPhone || !isValidKenyanPhone(identity.phone)) {
      setError('Enter a valid Kenyan phone number (07XX or 01XX).');
      return;
    }

    setSaving(true);
    setError('');
    try {
      // Server-side uniqueness check (defense against race condition + RLS bypass)
      const checkRes = await base44.functions.invoke('checkPhoneUniqueness', { phone: normalizedPhone });
      if (checkRes.data?.conflict) {
        setPhoneConflict(true);
        setError('This phone number is already linked to a BodaSure account.');
        setSaving(false);
        return;
      }

      const fullName = joinFullName(identity.firstName, identity.middleName, identity.lastName);
      // Save profile fields first so sasapayPersonalOnboarding can read them
      await base44.auth.updateMe({
        full_name: fullName,
        middle_name: identity.middleName,
        national_id: identity.national_id,
        phone: normalizedPhone,
        county_id: identity.county_id,
      });
      await refreshUser();

      // Call onboarding — BodaSure Wallet sends OTP to rider's phone
      const res = await base44.functions.invoke('sasapayPersonalOnboarding', { action: 'init' });
      if (res.data?.success) {
        if (res.data?.recovered) {
          // Account already exists from a prior partial attempt — wallet was
          // updated by the backend. Skip OTP and go straight to Set PIN.
          await base44.auth.updateMe({ wallet_tier: 1 });
          await refreshUser();
          setStep(2);
        } else {
          setRequestId(res.data.requestId);
          setStep(1);
        }
      } else {
        setError(res.data?.error || 'Failed to start activation. Try again.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Activation failed. Try again.');
    }
    setSaving(false);
  }

  // Step 1: Verify OTP from SasaPay
  async function handleConfirm() {
    if (otp.length < 4) {
      setError('Enter the OTP sent to your phone.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await base44.functions.invoke('sasapayPersonalOnboarding', {
        action: 'confirm',
        otp,
        requestId,
      });
      if (res.data?.success) {
        // BUG 4: Re-attempt wallet fetch if it failed to load on mount
        let activeWallet = wallet;
        if (!activeWallet) {
          try {
            activeWallet = await getOrCreateWallet(user.id);
            setWallet(activeWallet);
          } catch {
            throw new Error('Wallet not loaded. Please go back and try again.');
          }
        }
        // BUG 5/6: Backend already sets tier=1/status=active in confirmPersonalOnboarding;
        // no duplicate frontend Wallet.update needed — just update the user profile.
        await base44.auth.updateMe({ wallet_tier: 1 });
        await refreshUser();
        setStep(2);
      } else {
        setError(res.data?.error || 'Verification failed. Check your code and try again.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Verification failed. Try again.');
    }
    setSaving(false);
  }

  async function handleResendOtp() {
    setSaving(true);
    setError('');
    try {
      const res = await base44.functions.invoke('sasapayPersonalOnboarding', {
        action: 'resendOtp',
        requestId,
      });
      if (res.data?.success) {
        if (res.data?.requestId) {
          setRequestId(res.data.requestId);
        }
        setOtp('');
        setError('');
      } else {
        setError(res.data?.error || 'Failed to resend OTP. Try again.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to resend OTP. Try again.');
    }
    setSaving(false);
  }

  // Step 2: Set transaction PIN
  async function handleSetPin() {
    if (pin.length !== 4) { setError('PIN must be 4 digits.'); return; }
    if (pin !== pinConfirm) { setError('PINs do not match.'); return; }
    setSaving(true);
    setError('');
    try {
      if (!wallet) throw new Error('Wallet not loaded. Please go back and try again.');
      const pinSet = await setWalletPin(wallet.id, pin);
      if (!pinSet) throw new Error('Failed to set PIN.');
      await auditLog({
        userId: user.id,
        action: 'wallet_activated_tier1',
        entityType: 'Wallet',
        entityId: wallet.id,
        description: `Wallet activated to Tier 1 (SasaPay basic onboarding) for user ${user.id}`,
      });
      await refreshUser();
      setStep(3);
    } catch (e) {
      setError(e.message || 'Failed to set PIN. Try again.');
    }
    setSaving(false);
  }

  if (!user) return <PageSkeleton variant="hero-rows" />;

  const steps = [
    { title: 'Activate', icon: Smartphone },
    { title: 'Verify OTP', icon: Shield },
    { title: 'Set PIN', icon: KeyRound },
    { title: 'Done', icon: Check },
  ];

  return (
    <div className="p-5 animate-fade-in min-h-screen">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">Activate Wallet</h1>
      </div>

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

      {/* Step 0: Profile + SasaPay init */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="bg-accent rounded-xl p-4 flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-sm text-muted-foreground">We'll create your BodaSure Wallet using your phone number and National ID. An OTP will be sent to your phone.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">First Name</label>
              <input
                type="text"
                value={identity.firstName}
                onChange={e => setIdentity(i => ({ ...i, firstName: e.target.value }))}
                placeholder="John"
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Middle Name <span className="text-muted-foreground/60">(optional)</span></label>
              <input
                type="text"
                value={identity.middleName}
                onChange={e => setIdentity(i => ({ ...i, middleName: e.target.value }))}
                placeholder="Kimeu"
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Last Name</label>
              <input
                type="text"
                value={identity.lastName}
                onChange={e => setIdentity(i => ({ ...i, lastName: e.target.value }))}
                placeholder="Omondi"
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <PhoneInput
            value={identity.phone}
            onChange={(e164) => {
              setIdentity(i => ({ ...i, phone: e164 }));
              if (phoneConflict) setPhoneConflict(false);
            }}
            onBlur={handlePhoneBlur}
            error={phoneConflict ? 'This number is already linked to a BodaSure account.' : null}
          />
          <div>
            <label className="text-xs font-medium text-muted-foreground">National ID Number</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={identity.national_id}
              onChange={e => setIdentity(i => ({ ...i, national_id: e.target.value.replace(/[^\d]/g, '') }))}
              placeholder="00000000"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {identity.national_id && !/^\d{6,8}$/.test(identity.national_id) && (
              <p className="text-xs text-destructive mt-1">National ID must be 6–8 digits</p>
            )}
          </div>
          <CountyPicker
            counties={counties}
            value={identity.county_id}
            onChange={(id) => setIdentity(i => ({ ...i, county_id: id }))}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={handleInit}
            disabled={saving || !identity.firstName || !identity.lastName || !identity.national_id || !identity.phone || !identity.county_id || !/^\d{6,8}$/.test(identity.national_id) || !isValidKenyanPhone(identity.phone) || phoneConflict || phoneChecking}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</> : <><Smartphone className="w-4 h-4" /> Activate Wallet</>}
          </button>
        </div>
      )}

      {/* Step 1: OTP from SasaPay */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-accent rounded-xl p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-sm text-muted-foreground">Enter the OTP sent to <span className="font-semibold text-foreground">{formatPhoneDisplay(identity.phone)}</span> by BodaSure Wallet.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Enter OTP Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full mt-1 px-3 py-3 rounded-xl border border-input bg-background text-2xl text-center tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">Check your phone for the verification code</p>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setStep(0)} className="px-5 py-3 rounded-xl border border-border text-sm font-semibold">
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || otp.length < 4}
              className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : <>Verify <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
          <button
            onClick={handleResendOtp}
            disabled={saving}
            className="w-full text-sm text-primary font-medium py-2 hover:underline"
          >
            Didn't receive code? Resend OTP
          </button>
        </div>
      )}

      {/* Step 2: Set PIN */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-success/10 rounded-xl p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-success flex-shrink-0" />
            <p className="text-sm text-muted-foreground">BodaSure Wallet activated! Now set a 4-digit PIN to confirm all your transactions.</p>
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
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={handleSetPin}
            disabled={saving || pin.length !== 4 || pinConfirm.length !== 4}
            className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting PIN...</> : <><KeyRound className="w-4 h-4" /> Set PIN</>}
          </button>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-success" />
          </div>
          <h2 className="font-heading font-bold text-xl mb-2">Wallet Activated!</h2>
          <p className="text-sm text-muted-foreground mb-6">Your BodaSure Wallet is now Tier 1. You can deposit money, pay county fees, and pay bike owners.</p>
          <div className="bg-card border border-border rounded-2xl p-4 mb-4 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Wallet Tier</span>
              <span className="text-sm font-bold text-primary">Tier 1 (Basic)</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Available Features</span>
              <span className="text-sm font-bold">Deposit, Lipa County, Lipa Owner</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Locked (Needs KYC)</span>
              <span className="text-sm font-bold text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" /> Lipisha, Withdraw</span>
            </div>
          </div>
          <button onClick={() => navigate('/app/wallet')} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm">
            Go to Wallet
          </button>
          <button onClick={() => navigate('/app/profile', { state: { targetPhase: 5 } })} className="w-full mt-2 text-sm text-primary py-2 font-medium flex items-center justify-center gap-1">
            <Shield className="w-4 h-4" /> Continue to KYC Verification
          </button>
        </div>
      )}
    </div>
  );
}
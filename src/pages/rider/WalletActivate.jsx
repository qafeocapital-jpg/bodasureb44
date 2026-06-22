import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getOrCreateWallet } from '@/lib/payments';
import { hashPin } from '@/lib/pin';
import { auditLog } from '@/lib/audit';
import { ChevronLeft, ChevronRight, Check, Shield, KeyRound, FileCheck, Loader2 } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';
import { formatPhoneDisplay } from '@/lib/phone';

export default function WalletActivate() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [step, setStep] = useState(0);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [identity, setIdentity] = useState({ full_name: '', national_id: '', date_of_birth: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        setIdentity({
          full_name: user.full_name || '',
          national_id: user.national_id || '',
          date_of_birth: user.date_of_birth || '',
        });
        const w = await getOrCreateWallet(user.id);
        setWallet(w);
      } catch (e) {}
    }
    load();
  }, [user]);

  function sendOtp() {
    setOtpSent(true);
  }

  function verifyOtp() {
    setStep(1);
  }

  function handlePinSet() {
    if (pin.length !== 4) { setPinError('PIN must be 4 digits'); return; }
    if (pin !== pinConfirm) { setPinError('PINs do not match'); return; }
    setPinError('');
    setStep(2);
  }

  async function handleActivate() {
    setSaving(true);
    try {
      // Check National ID uniqueness
      if (identity.national_id) {
        const existing = await base44.entities.User.filter({ national_id: identity.national_id });
        const conflict = existing.find(u => u.id !== user.id);
        if (conflict) {
          setPinError('This National ID is already registered to another user.');
          setSaving(false);
          return;
        }
      }
      await base44.entities.Wallet.update(wallet.id, {
        tier: 1,
        status: 'active',
        pin_hash: hashPin(pin),
        sasapay_customer_id: `mock_${user?.id}`,
      });
      await base44.auth.updateMe({
        wallet_tier: 1,
        full_name: identity.full_name,
        national_id: identity.national_id,
        date_of_birth: identity.date_of_birth,
        profile_complete: true,
      });
      await auditLog({ userId: user.id, action: 'wallet_activated', entityType: 'Wallet', entityId: wallet.id, description: `Wallet activated to Tier 1 for user ${user.id}` });
      await refreshUser();
      setStep(3);
    } catch (e) {
      setPinError(e.message || 'Activation failed. Try again.');
    }
    setSaving(false);
  }

  if (!user) return <PageSkeleton variant="hero-rows" />;

  const steps = [
    { title: 'Verify Phone', icon: Shield },
    { title: 'Set PIN', icon: KeyRound },
    { title: 'Identity', icon: FileCheck },
    { title: 'Activate', icon: Check },
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

      {/* Step 0: Phone OTP */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="bg-accent rounded-xl p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-sm text-muted-foreground">We'll send a one-time code to your phone to verify it's you.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
            <input
              type="tel"
              value={formatPhoneDisplay(user.phone) || user.phone || ''}
              disabled
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-muted text-sm"
            />
          </div>
          {!otpSent ? (
            <button onClick={sendOtp} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm">
              Send OTP
            </button>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Enter OTP Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full mt-1 px-3 py-3 rounded-xl border border-input bg-background text-2xl text-center tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5">Mock mode: Enter any 4 digits to continue</p>
              </div>
              <button onClick={verifyOtp} disabled={otp.length !== 4} className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
                Verify <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Step 1: Set PIN */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-accent rounded-xl p-4 flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-sm text-muted-foreground">Create a 4-digit PIN. You'll use this to confirm all outgoing transactions from your wallet.</p>
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
          {pinError && <p className="text-xs text-destructive">{pinError}</p>}
          <div className="flex gap-2">
            <button onClick={() => setStep(0)} className="px-5 py-3 rounded-xl border border-border text-sm font-semibold">
              Back
            </button>
            <button onClick={handlePinSet} disabled={pin.length !== 4 || pinConfirm.length !== 4} className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Identity */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-accent rounded-xl p-4 flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-sm text-muted-foreground">Confirm your identity details. You'll need to upload KYC documents later to unlock Tier 2 (withdrawals).</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Full Name</label>
            <input
              type="text"
              value={identity.full_name}
              onChange={e => setIdentity(i => ({ ...i, full_name: e.target.value }))}
              placeholder="John Mwangi"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">National ID Number *</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={identity.national_id}
              onChange={e => setIdentity(i => ({ ...i, national_id: e.target.value.replace(/[^\d]/g, '') }))}
              placeholder="00000000"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {identity.national_id && !/^\d{7,8}$/.test(identity.national_id) && (
              <p className="text-xs text-destructive mt-1">National ID must be 7–8 digits</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Date of Birth</label>
            <input
              type="date"
              value={identity.date_of_birth}
              onChange={e => setIdentity(i => ({ ...i, date_of_birth: e.target.value }))}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(1)} className="px-5 py-3 rounded-xl border border-border text-sm font-semibold">
              Back
            </button>
            <button
              onClick={handleActivate}
              disabled={saving || !identity.full_name || !identity.national_id || !/^\d{7,8}$/.test(identity.national_id)}
              className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Activating...</> : <><Shield className="w-4 h-4" /> Activate Wallet</>}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-success" />
          </div>
          <h2 className="font-heading font-bold text-xl mb-2">Wallet Activated!</h2>
          <p className="text-sm text-muted-foreground mb-6">Your wallet is now Tier 1. You can deposit and receive money. Upload KYC documents to unlock withdrawals and sending.</p>
          <div className="bg-card border border-border rounded-2xl p-4 mb-6 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Wallet Tier</span>
              <span className="text-sm font-bold text-primary">Tier 1</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Balance Limit</span>
              <span className="text-sm font-bold">KES 5,000</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Can Withdraw</span>
              <span className="text-sm font-bold text-muted-foreground">Upload KYC →</span>
            </div>
          </div>
          <button onClick={() => navigate('/app/wallet')} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm">
            Go to Wallet
          </button>
          <button onClick={() => navigate('/app/kyc')} className="w-full mt-2 text-sm text-primary py-2 font-medium">
            Upload KYC Documents
          </button>
        </div>
      )}
    </div>
  );
}
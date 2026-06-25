// Step 1: OTP entry and resend
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { ChevronRight, Loader2, AlertTriangle, Shield } from 'lucide-react';

export default function PhasePersonalOtp({ requestId, onRequestIdUpdated, onOtpConfirmed, onBack }) {
  const { refreshUser } = useAuth();
  const [otp, setOtp] = useState('');
  const [saving, setSaving] = useState(false);
  const [walletError, setWalletError] = useState('');

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
        onOtpConfirmed();
      } else {
        setWalletError(res.data?.error || 'Verification failed. Check your code and try again.');
      }
    } catch (e) {
      setWalletError(e.response?.data?.error || e.message || 'Verification failed. Try again.');
    }
    setSaving(false);
  }

  async function handleResendOtp() {
    setSaving(true);
    setWalletError('');
    try {
      const res = await base44.functions.invoke('sasapayPersonalOnboarding', {
        action: 'resendOtp',
        requestId,
      });
      if (res.data?.success) {
        if (res.data?.requestId && onRequestIdUpdated) {
          onRequestIdUpdated(res.data.requestId);
        }
        setOtp('');
        setWalletError('');
      } else {
        setWalletError(res.data?.error || 'Failed to resend OTP. Try again.');
      }
    } catch (e) {
      setWalletError(e.response?.data?.error || e.message || 'Failed to resend OTP.');
    }
    setSaving(false);
  }

  return (
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
        <p className="text-[10px] text-muted-foreground mt-1.5">Check your phone for the verification code</p>
      </div>
      {walletError && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{walletError}</p>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onBack} className="px-5 py-3 rounded-xl border border-border text-sm font-semibold">
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
      <button
        onClick={handleResendOtp}
        disabled={saving}
        className="w-full text-sm text-primary font-medium py-2 hover:underline"
      >
        Didn't receive code? Resend OTP
      </button>
    </div>
  );
}
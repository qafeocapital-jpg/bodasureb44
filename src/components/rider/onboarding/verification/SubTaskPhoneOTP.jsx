import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Smartphone, ChevronLeft, Check, AlertTriangle, Loader2, KeyRound } from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/phone';

export default function SubTaskPhoneOTP({ user, onDataChange, onBack }) {
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(user?.phone_verified === true);

  async function handleSendOtp() {
    setSending(true);
    setError('');
    try {
      await base44.functions.invoke('sendOtp', {});
      setOtpSent(true);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to send OTP');
    }
    setSending(false);
  }

  async function handleVerify() {
    if (!otpCode || otpCode.length !== 4) return;
    setVerifying(true);
    setError('');
    try {
      const res = await base44.functions.invoke('verifyOtpCode', { otpCode });
      if (res.data?.valid) {
        setVerified(true);
        await onDataChange();
      } else {
        setError('Invalid code. Please try again.');
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Verification failed');
    }
    setVerifying(false);
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4" /> Back to tasks
      </button>

      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-sm">Phone OTP Verification</h3>
          <p className="text-[10px] text-muted-foreground">Verify your registered phone number</p>
        </div>
      </div>

      {/* Phone number display */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Registered Phone</p>
        <p className="text-base font-heading font-bold text-primary">{user?.phone ? formatPhoneDisplay(user.phone) : 'Not set'}</p>
      </div>

      {verified ? (
        <div className="bg-success/5 border border-success/20 rounded-xl p-4 text-center">
          <Check className="w-8 h-8 mx-auto text-success mb-2" />
          <p className="text-sm font-semibold text-success">Phone Verified!</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Your phone number has been confirmed</p>
        </div>
      ) : !otpSent ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            We'll send a 4-digit code to <span className="font-semibold">{user?.email}</span> to verify your account.
          </p>
          <button
            onClick={handleSendOtp}
            disabled={sending}
            className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Send Verification Code
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Enter 4-digit code</label>
            <input
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              inputMode="numeric"
              maxLength={4}
              className="w-full mt-1 px-3 py-3 rounded-xl border border-input bg-background text-2xl font-heading font-bold text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleVerify}
            disabled={otpCode.length !== 4 || verifying}
            className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
          >
            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Verify Code
          </button>
          <button
            onClick={handleSendOtp}
            disabled={sending}
            className="w-full text-xs text-primary font-semibold underline"
          >
            {sending ? 'Resending...' : 'Resend code'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
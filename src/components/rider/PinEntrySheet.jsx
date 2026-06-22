import { useState } from 'react';
import { X, Loader2, Lock } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function PinEntrySheet({ open, onClose, onConfirm, title = 'Enter PIN', message = 'Enter your 4-digit wallet PIN to confirm.' }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  if (!open) return null;

  async function handleConfirm() {
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN.');
      return;
    }
    setError('');
    setVerifying(true);
    try {
      await onConfirm(pin);
      setPin('');
      onClose();
    } catch (e) {
      setError(e.message || 'Invalid PIN. Try again.');
    } finally {
      setVerifying(false);
    }
  }

  function handleClose() {
    setPin('');
    setError('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-[512px] bg-card rounded-t-3xl p-6 pb-24 animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-accent">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <h3 className="font-heading font-bold text-lg mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-5">{message}</p>

        <div className="flex justify-center mb-4">
          <InputOTP maxLength={4} value={pin} onChange={setPin}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && <p className="text-sm text-destructive text-center mb-3">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={verifying || pin.length !== 4}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
        >
          {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm'}
        </button>
        <button onClick={handleClose} className="w-full mt-2 text-center text-sm text-muted-foreground py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
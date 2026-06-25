// Step 2: 4-digit PIN creation
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronRight, Loader2, AlertTriangle, Check } from 'lucide-react';

export default function PhasePersonalPin({ onPinSet }) {
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [walletError, setWalletError] = useState('');

  async function handleSetPin() {
    if (pin.length !== 4) { setWalletError('PIN must be 4 digits.'); return; }
    if (pin !== pinConfirm) { setWalletError('PINs do not match.'); return; }
    setSaving(true);
    setWalletError('');
    try {
      const res = await base44.functions.invoke('setWalletPin', { pin });
      if (res.data?.success) {
        onPinSet();
      } else {
        setWalletError(res.data?.error || 'Failed to set PIN. Try again.');
      }
    } catch (e) {
      setWalletError(e.response?.data?.error || e.message || 'Failed to set PIN.');
    }
    setSaving(false);
  }

  return (
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
  );
}
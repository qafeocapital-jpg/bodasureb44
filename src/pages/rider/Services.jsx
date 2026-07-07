import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES } from '@/lib/format';
import { processWalletPayment, getOrCreateWallet } from '@/lib/payments';
import { verifyPin } from '@/lib/pin';
import { ChevronLeft, Phone, Wifi, Zap, Droplet, Tv, Receipt, Loader2, CheckCircle2, XCircle, Coins } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';
import UnlockSheet from '@/components/rider/UnlockSheet';
import PinEntrySheet from '@/components/rider/PinEntrySheet';
import { checkServiceAccess } from '@/lib/serviceAccess';

export default function Services() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [selectedService, setSelectedService] = useState(null);
  const [accountRef, setAccountRef] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showUnlock, setShowUnlock] = useState(false);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const w = await getOrCreateWallet(user.id);
        setWallet(w);
        const snaps = await base44.entities.WalletSnapshot.filter({ wallet_id: w.id });
        if (snaps.length > 0) setBalance(snaps[0].balance_cents || 0);
      } catch (e) {}
    }
    load();
  }, [user]);

  const services = [
    { key: 'airtime', label: 'Airtime', icon: Phone, color: 'bg-orange-50 text-orange-600', placeholder: 'Phone number' },
    { key: 'data', label: 'Data Bundles', icon: Wifi, color: 'bg-blue-50 text-blue-600', placeholder: 'Phone number' },
    { key: 'kplc', label: 'KPLC Tokens', icon: Zap, color: 'bg-amber-50 text-amber-600', placeholder: 'Meter number' },
    { key: 'water', label: 'Water Bill', icon: Droplet, color: 'bg-sky-50 text-sky-600', placeholder: 'Account number' },
    { key: 'tv', label: 'TV / DStv', icon: Tv, color: 'bg-violet-50 text-violet-600', placeholder: 'IUC / Account number' },
    { key: 'bills', label: 'Other Bills', icon: Receipt, color: 'bg-emerald-50 text-emerald-600', placeholder: 'Paybill / Account' },
    { key: 'save', label: 'Save & Earn', icon: Coins, color: 'bg-teal-50 text-teal-600', placeholder: 'Savings amount' },
  ];

  async function handlePay() {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || !wallet) return;
    setShowPin(true);
  }

  async function handlePinConfirm(pin) {
    if (!(await verifyPin(pin, wallet.id))) {
      throw new Error('Incorrect PIN. Try again.');
    }
    setShowPin(false);
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || !wallet) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await processWalletPayment({
        walletId: wallet.id,
        type: 'utility',
        amountCents: cents,
        counterpartyPhone: accountRef,
        description: `${selectedService.label} — ${accountRef}`,
        productType: selectedService.key,
      });
      // Re-fetch balance from server for accuracy
      const snaps = await base44.entities.WalletSnapshot.filter({ wallet_id: wallet.id });
      if (snaps.length > 0) setBalance(snaps[0].balance_cents || 0);
      setResult({ success: true, amount: cents, reference: res.reference });
      setAmount('');
      setAccountRef('');
    } catch (e) {
      setResult({ success: false, message: e.message || 'Payment failed. Try again.' });
    }
    setLoading(false);
  }

  if (!wallet) return <PageSkeleton variant="hero-rows" />;

  const isTier2 = user?.kyc_status === 'verified' || (wallet?.tier || 0) >= 2;

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">Services</h1>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary to-orange-600 text-primary-foreground rounded-2xl p-4 mb-5">
        <p className="text-xs text-orange-100">Wallet Balance</p>
        <p className="text-2xl font-heading font-bold">{formatKES(balance)}</p>
      </div>

      {!isTier2 && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-5 flex items-center gap-3">
          <Coins className="w-5 h-5 text-warning flex-shrink-0" />
          <p className="text-xs text-warning">Complete KYC to unlock Tier 2 and pay for services from your wallet.</p>
          <button onClick={() => setShowUnlock(true)} className="ml-auto bg-warning text-warning-foreground rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap">Unlock</button>
        </div>
      )}

      {result?.success && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-5 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-success">Payment Successful!</p>
            <p className="text-xs text-muted-foreground">{formatKES(result.amount)} · Ref: {result.reference}</p>
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-5 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{result.message}</p>
        </div>
      )}

      {/* Service Grid */}
      {!selectedService ? (
        <div className="grid grid-cols-3 gap-3">
          {services.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => {
                  if (!isTier2) { setShowUnlock(true); return; }
                  setSelectedService(s);
                }}
                className="flex flex-col items-center gap-2 p-3 cursor-pointer bg-card border border-border rounded-2xl hover:bg-accent transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-medium text-center">{s.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <button onClick={() => { setSelectedService(null); setResult(null); }} className="flex items-center gap-1 text-xs text-muted-foreground">
            <ChevronLeft className="w-4 h-4" /> Back to services
          </button>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedService.color}`}>
              <selectedService.icon className="w-6 h-6" />
            </div>
            <h2 className="font-heading font-bold text-base">{selectedService.label}</h2>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{selectedService.placeholder}</label>
            <input
              type="text"
              value={accountRef}
              onChange={e => setAccountRef(e.target.value)}
              placeholder={selectedService.placeholder}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Amount (KES)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full mt-1 px-3 py-3 rounded-xl border border-input bg-background text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={handlePay}
            disabled={loading || !amount || !accountRef}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Pay {formatKES(amount ? Math.round(parseFloat(amount) * 100) : 0)}</>}
          </button>
        </div>
      )}

      <UnlockSheet
        open={showUnlock}
        onClose={() => setShowUnlock(false)}
        title="Tier 2 Required"
        message="Complete KYC verification (Tier 2) to access bill payments and services."
        actionLabel="Verify Now"
        actionLink="/app/kyc"
      />

      <PinEntrySheet
        open={showPin}
        onClose={() => setShowPin(false)}
        onConfirm={handlePinConfirm}
        title="Enter PIN to Pay"
      />
      </div>
      );
      }
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES, formatDateTime } from '@/lib/format';
import { getOrCreateWallet, initiateStkPush } from '@/lib/payments';
import { ChevronLeft, HandCoins, Loader2, CheckCircle2, XCircle, Receipt } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';
import PhoneInput from '@/components/ui/PhoneInput';
import UnlockSheet from '@/components/rider/UnlockSheet';
import { checkServiceAccess } from '@/lib/serviceAccess';
import { lookupFee, checkTransactionLimits } from '@/lib/feeEngine';
import { isValidKenyanPhone, formatPhoneDisplay } from '@/lib/phone';

export default function Lipisha() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [accessInfo, setAccessInfo] = useState(null);
  const [feePreview, setFeePreview] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const w = await getOrCreateWallet(user.id);
        setWallet(w);
        const snaps = await base44.entities.WalletSnapshot.filter({ wallet_id: w.id });
        if (snaps.length > 0) setBalance(snaps[0].balance_cents || 0);
        const txns = await base44.entities.Transaction.filter({ wallet_id: w.id, type: 'lipisha' }, '-created_date', 10);
        setHistory(txns);
        const access = checkServiceAccess('lipisha', { user, wallet: w });
        if (!access.unlocked) setAccessInfo(access);
        try {
          const limits = await checkTransactionLimits(w.id, 'lipisha', 0);
          setLimitInfo(limits);
        } catch (e) {}
      } catch (e) {}
    }
    load();
  }, [user]);

  async function handleCollect() {
    const cents = Math.round(parseFloat(amount) * 100);
    const amountKes = parseFloat(amount);
    if (!isValidKenyanPhone(phone) || !cents || cents <= 0) return;

    // Check daily limits before proceeding
    const limitCheck = await checkTransactionLimits(wallet.id, 'lipisha', amountKes);
    if (!limitCheck.canProceed) {
      setResult({ success: false, message: limitCheck.errorMessage });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await initiateStkPush({
        walletId: wallet.id,
        phone,
        amountCents: cents,
        description: `Fare collection from ${phone}`,
        transactionType: 'lipisha',
      });
      if (res.mode === 'live' && res.status === 'pending') {
        setResult({ success: true, pending: true, amount: cents, phone, reference: res.reference, message: res.message });
      } else {
        setBalance(prev => prev + cents);
        setResult({ success: true, amount: cents, phone, reference: res.reference });
      }
      setPhone('');
      setAmount('');
      const txns = await base44.entities.Transaction.filter({ wallet_id: wallet.id, type: 'lipisha' }, '-created_date', 10);
      setHistory(txns);
    } catch (e) {
      setResult({ success: false, message: e.message || 'Could not collect fare. Please try again.' });
    }
    setLoading(false);
  }

  // Fee preview — lookup when amount changes
  useEffect(() => {
    const amountKes = parseFloat(amount);
    if (!amountKes || amountKes <= 0) { setFeePreview(null); return; }
    lookupFee('collection', amountKes).then(setFeePreview).catch(() => setFeePreview(null));
  }, [amount]);

  if (!wallet) return <PageSkeleton variant="hero-rows" />;

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">Collect Fare</h1>
      </div>

      <div className="bg-accent rounded-xl p-4 mb-5 flex items-center gap-3">
        <HandCoins className="w-5 h-5 text-primary flex-shrink-0" />
        <p className="text-sm text-muted-foreground">Send an M-Pesa STK push to your customer's phone. They enter their PIN and the fare lands in your wallet.</p>
      </div>

      {result?.success && result.pending && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-5 flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-warning flex-shrink-0 animate-spin" />
          <div>
            <p className="text-sm font-bold text-warning">STK Push Sent!</p>
            <p className="text-xs text-muted-foreground">{formatKES(result.amount)} from {formatPhoneDisplay(result.phone)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Ref: {result.reference} · {result.message}</p>
          </div>
        </div>
      )}

      {result?.success && !result.pending && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-5 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-success">Fare Collected!</p>
            <p className="text-xs text-muted-foreground">{formatKES(result.amount)} from {formatPhoneDisplay(result.phone)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Ref: {result.reference} · No fees applied</p>
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-5 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{result.message}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div>
          <PhoneInput
            value={phone}
            onChange={setPhone}
            label="Customer Phone Number"
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
        <div className="flex gap-2 flex-wrap">
          {[50, 100, 150, 200].map(amt => (
            <button key={amt} onClick={() => setAmount(amt.toString())} className="flex-1 bg-accent rounded-lg py-2 text-sm font-semibold text-primary hover:bg-accent/80 transition-colors">
              {amt}
            </button>
          ))}
        </div>
        {feePreview && feePreview.bodasureMarkupKes > 0 && (
          <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2.5">
            <span className="text-xs text-muted-foreground">Fee (BodaSure markup)</span>
            <span className="text-sm font-bold text-primary">KES {(feePreview.bodasureMarkupKes / 100).toFixed(2)}</span>
          </div>
        )}
        {limitInfo && (
          <div className="text-xs text-muted-foreground">
            Daily usage: KES {(limitInfo.daily_used_kes || 0).toLocaleString()} / {limitInfo.daily_limit_kes.toLocaleString()} · Remaining: KES {(limitInfo.remaining_kes || 0).toLocaleString()}
          </div>
        )}
        <button
          onClick={handleCollect}
          disabled={loading || !isValidKenyanPhone(phone) || !amount}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50"
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending STK Push...</> : <><HandCoins className="w-5 h-5" /> Collect Fare</>}
        </button>
      </div>

      {loading && (
        <div className="mt-4 bg-warning/10 border border-warning/20 rounded-xl p-4 text-center">
          <Loader2 className="w-6 h-6 text-warning mx-auto mb-2 animate-spin" />
          <p className="text-sm font-medium text-warning">Check your customer's phone</p>
          <p className="text-xs text-muted-foreground">Waiting for M-Pesa confirmation...</p>
        </div>
      )}

      <UnlockSheet
        open={!!accessInfo}
        onClose={() => setAccessInfo(null)}
        title={accessInfo?.title}
        message={accessInfo?.message}
        actionLabel={accessInfo?.actionLabel}
        actionLink={accessInfo?.actionLink}
        onAction={() => { if (accessInfo?.actionLink) navigate(accessInfo.actionLink); }}
      />

      {/* History */}
      <div className="mt-6">
        <h2 className="text-sm font-heading font-bold mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4" /> Recent Collections
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No fare collections yet</p>
        ) : (
          <div className="space-y-2">
            {history.map(tx => (
              <div key={tx.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium">From {tx.counterparty_phone ? formatPhoneDisplay(tx.counterparty_phone) : 'Customer'}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(tx.created_date)}</p>
                </div>
                <p className="text-sm font-bold text-success">+{formatKES(tx.amount_cents)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
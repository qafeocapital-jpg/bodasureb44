import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES, formatDateTime } from '@/lib/format';
import { processWalletPayment, getOrCreateWallet } from '@/lib/payments';
import { verifyPin } from '@/lib/pin';
import { checkServiceAccess } from '@/lib/serviceAccess';
import { auditLog } from '@/lib/audit';
import UnlockSheet from '@/components/rider/UnlockSheet';
import { ChevronLeft, UserCheck, Loader2, CheckCircle2, XCircle, Receipt } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';

export default function LipaOwner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [bikes, setBikes] = useState([]);
  const [owners, setOwners] = useState({});
  const [selectedBike, setSelectedBike] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [accessInfo, setAccessInfo] = useState(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const w = await getOrCreateWallet(user.id);
        setWallet(w);
        // Get bikes the user rides but does NOT own
        const ridden = await base44.entities.Vehicle.filter({ rider_id: user.id, status: 'approved' });
        const notOwned = ridden.filter(b => !b.is_owner_rider && b.owner_id !== user.id);
        setBikes(notOwned);
        // Fetch owner user details
        const ownerIds = [...new Set(notOwned.map(b => b.owner_id).filter(Boolean))];
        const ownerMap = {};
        await Promise.all(ownerIds.map(async oid => {
          try {
            const u = await base44.entities.User.filter({ id: oid });
            if (u.length > 0) ownerMap[oid] = u[0];
          } catch (e) {}
        }));
        setOwners(ownerMap);
        const txns = await base44.entities.Transaction.filter({ wallet_id: w.id, type: 'lipa_owner' }, '-created_date', 10);
        setHistory(txns);
        const access = checkServiceAccess('lipa_owner', { user, wallet: w });
        if (!access.unlocked) setAccessInfo(access);
      } catch (e) {}
    }
    load();
  }, [user]);

  const selectedBikeObj = bikes.find(b => b.id === selectedBike);

  async function handleConfirm() {
    setPinError('');
    if (pin.length !== 4) { setPinError('Enter your 4-digit PIN'); return; }
    if (wallet.pin_hash && !verifyPin(pin, wallet.pin_hash)) {
      setPinError('Incorrect PIN. Please try again.');
      return;
    }
    setLoading(true);
    const cents = Math.round(parseFloat(amount) * 100);
    try {
      // Find or create owner wallet
      let ownerWallet = null;
      if (selectedBikeObj?.owner_id) {
        const ownerWallets = await base44.entities.Wallet.filter({ user_id: selectedBikeObj.owner_id, entity_type: 'personal' });
        if (ownerWallets.length > 0) ownerWallet = ownerWallets[0];
      }

      const res = await processWalletPayment({
        walletId: wallet.id,
        type: 'lipa_owner',
        amountCents: cents,
        counterpartyWalletId: ownerWallet?.id,
        description: `Payment to owner for ${selectedBikeObj.plate_number}`,
        productType: 'lipa_owner',
        vehicleId: selectedBike,
      });

      setResult({ success: true, amount: cents, reference: res.reference, owner: selectedBikeObj?.owner_id });
      setAmount('');
      setPin('');
      setSelectedBike('');
      setShowPin(false);

      // Notify the owner of the payment via email
      const ownerId = selectedBikeObj?.owner_id;
      if (ownerId) {
        try {
          const ownerUser = owners[ownerId];
          // Send email notification if owner has an email
          if (ownerUser?.email) {
            await base44.integrations.Core.SendEmail({
              to: ownerUser.email,
              subject: 'BodaSure — Owner Payment Received',
              body: `Hello ${ownerUser.full_name || 'Owner'},<br><br>You have received ${formatKES(cents)} from ${user.full_name || 'a rider'} for bike <strong>${selectedBikeObj.plate_number}</strong>.<br><br>Reference: ${res.reference}<br><br>Thank you for using BodaSure.`,
            });
          }
        } catch (e) {}
      }

      // Audit log the payment
      await auditLog({ userId: user.id, action: 'lipa_owner_payment', entityType: 'Transaction', entityId: res.transaction?.id, description: `Paid owner ${formatKES(cents)} for bike ${selectedBikeObj.plate_number}. Ref: ${res.reference}` });

      const txns = await base44.entities.Transaction.filter({ wallet_id: wallet.id, type: 'lipa_owner' }, '-created_date', 10);
      setHistory(txns);
    } catch (e) {
      setResult({ success: false, message: e.message || 'Could not complete payment. Try again.' });
    }
    setLoading(false);
  }

  function handlePay() {
    if (!selectedBike || !amount) return;
    const access = checkServiceAccess('lipa_owner', { user, wallet });
    if (!access.unlocked) {
      setAccessInfo(access);
      return;
    }
    setShowPin(true);
  }

  if (!wallet) return <PageSkeleton variant="hero-rows" />;

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">Pay Owner</h1>
      </div>

      <div className="bg-accent rounded-xl p-4 mb-5 flex items-center gap-3">
        <UserCheck className="w-5 h-5 text-primary flex-shrink-0" />
        <p className="text-sm text-muted-foreground">Send money to the bike owner. Select a bike you ride but don't own.</p>
      </div>

      {result?.success && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-5 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-success">Payment Sent!</p>
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

      {bikes.length === 0 ? (
        <div className="bg-accent rounded-2xl p-8 text-center">
          <UserCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No bikes found where you're the rider but not the owner.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Select Bike</label>
            <select value={selectedBike} onChange={e => setSelectedBike(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Choose a bike</option>
              {bikes.map(b => <option key={b.id} value={b.id}>{b.plate_number} — {b.make}</option>)}
            </select>
          </div>

          {selectedBikeObj && (
            <div className="bg-accent rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Owner</p>
              <p className="text-sm font-semibold">
                {selectedBikeObj.owner_id && owners[selectedBikeObj.owner_id]
                  ? owners[selectedBikeObj.owner_id].full_name || 'Registered Owner'
                  : 'Owner not linked'}
              </p>
            </div>
          )}

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

          {/* Summary before PIN */}
          {selectedBike && amount && !showPin && (
            <div className="bg-accent rounded-xl p-4">
              <p className="text-xs font-bold text-foreground mb-2">Summary</p>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Bike</span>
                <span className="font-semibold">{selectedBikeObj?.plate_number}</span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formatKES(Math.round(parseFloat(amount) * 100))}</span>
              </div>
            </div>
          )}

          {!showPin ? (
            <button onClick={handlePay} disabled={!selectedBike || !amount} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50">
              <UserCheck className="w-5 h-5" /> Continue
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Enter Wallet PIN</label>
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
              {pinError && <p className="text-xs text-destructive">{pinError}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setShowPin(false); setPin(''); }} className="px-5 py-3 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={handleConfirm} disabled={loading || pin.length !== 4} className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Confirm Payment</>}
                </button>
              </div>
            </div>
          )}
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
      {history.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-heading font-bold mb-3 flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Payment History
          </h2>
          <div className="space-y-2">
            {history.map(tx => (
              <div key={tx.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Owner Payment</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(tx.created_date)}</p>
                </div>
                <p className="text-sm font-bold">{formatKES(tx.amount_cents)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
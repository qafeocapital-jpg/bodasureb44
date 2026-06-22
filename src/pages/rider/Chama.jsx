import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { formatKES, formatDate, formatDateTime } from '@/lib/format';
import { processWalletPayment, getOrCreateWallet } from '@/lib/payments';
import { verifyPin } from '@/lib/pin';
import { ChevronLeft, PiggyBank, Users, Loader2, CheckCircle2, Coins, ArrowUpFromLine } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import PinEntrySheet from '@/components/rider/PinEntrySheet';

export default function Chama() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [groupId, setGroupId] = useState(null);
  const [group, setGroup] = useState(null);
  const [groupWallet, setGroupWallet] = useState(null);
  const [poolBalance, setPoolBalance] = useState(0);
  const [userWallet, setUserWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [payMethod, setPayMethod] = useState('wallet');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const uw = await getOrCreateWallet(user.id);
        setUserWallet(uw);

        let gId = location.state?.groupId;
        if (!gId) {
          const myGroups = await base44.entities.Group.filter({ county_id: user.county_id, status: 'active' });
          if (myGroups.length > 0) gId = myGroups[0].id;
        }
        if (gId) {
          setGroupId(gId);
          const groups = await base44.entities.Group.filter({ id: gId });
          if (groups.length > 0) setGroup(groups[0]);

          const groupWallets = await base44.entities.Wallet.filter({ group_id: gId, entity_type: 'business' });
          if (groupWallets.length > 0) {
            const gw = groupWallets[0];
            setGroupWallet(gw);
            const snaps = await base44.entities.WalletSnapshot.filter({ wallet_id: gw.id });
            if (snaps.length > 0) setPoolBalance(snaps[0].balance_cents || 0);
            const txns = await base44.entities.Transaction.filter({ wallet_id: gw.id, type: 'chama' }, '-created_date', 10);
            setTransactions(txns);
          }
        }
      } catch (e) {}
    }
    load();
  }, [user]);

  async function handleContribute() {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || !groupWallet) return;
    // Wallet contributions require PIN verification
    if (payMethod === 'wallet' && userWallet) {
      setShowPin(true);
      return;
    }
    await processContribution(cents);
  }

  async function handlePinConfirm(pin) {
    if (!(await verifyPin(pin, userWallet.id))) {
      throw new Error('Incorrect PIN. Try again.');
    }
    setShowPin(false);
    const cents = Math.round(parseFloat(amount) * 100);
    await processContribution(cents);
  }

  async function processContribution(cents) {
    setLoading(true);
    setResult(null);
    try {
      let reference;
      if (payMethod === 'wallet' && userWallet) {
        // Wallet: processWalletPayment debits user wallet and credits group wallet (via counterpartyWalletId)
        const res = await processWalletPayment({
          walletId: userWallet.id,
          type: 'chama',
          amountCents: cents,
          counterpartyWalletId: groupWallet.id,
          description: `Chama contribution to ${group?.name || ''}`,
          productType: 'chama',
        });
        reference = res.reference;

        // Record a transaction on the group wallet side (for audit)
        await base44.entities.Transaction.create({
          wallet_id: groupWallet.id,
          type: 'deposit',
          amount_cents: cents,
          status: 'completed',
          reference: res.reference,
          product_type: 'chama',
          counterparty_wallet_id: userWallet.id,
          description: `Contribution received from ${user?.full_name || 'member'}`,
          completed_at: new Date().toISOString(),
        });
      } else {
        // M-Pesa: credit group wallet directly (type 'deposit' = credit)
        const res = await processWalletPayment({
          walletId: groupWallet.id,
          type: 'deposit',
          amountCents: cents,
          description: `Chama contribution via M-Pesa to ${group?.name || ''}`,
          productType: 'chama',
        });
        reference = res.reference;
      }

      // Re-fetch pool balance from server
      const groupSnaps = await base44.entities.WalletSnapshot.filter({ wallet_id: groupWallet.id });
      if (groupSnaps.length > 0) setPoolBalance(groupSnaps[0].balance_cents || 0);

      setResult({ success: true, amount: cents });
      setAmount('');
      const txns = await base44.entities.Transaction.filter({ wallet_id: groupWallet.id, type: 'chama' }, '-created_date', 10);
      setTransactions(txns);
    } catch (e) {
      setResult({ success: false, message: e.message || 'Contribution failed. Try again.' });
    }
    setLoading(false);
  }

  if (!group) {
    return (
      <div className="p-5 animate-fade-in">
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-heading font-bold">Chama</h1>
        </div>
        <div className="bg-accent rounded-2xl p-8 text-center">
          <PiggyBank className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">You need to join a group to access chama features.</p>
          <button onClick={() => navigate('/app/groups')} className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold">
            Browse Groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">Chama</h1>
      </div>

      {/* Pool Balance Hero */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl p-5 mb-5">
        <p className="text-xs text-blue-100 uppercase tracking-wide font-medium">{group.name}</p>
        <p className="text-3xl font-heading font-extrabold mt-1">{formatKES(poolBalance)}</p>
        <p className="text-xs text-blue-100 mt-1">Pool Balance</p>
      </div>

      {/* Rotation Queue */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-heading font-bold">Rotation Queue</h2>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</div>
            <span className="font-medium">You</span>
            <span className="ml-auto text-xs text-success font-semibold">Next payout</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">2</div>
            <span>Member 2</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">3</div>
            <span>Member 3</span>
          </div>
        </div>
      </div>

      {result?.success && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-5 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-success">Contribution Sent!</p>
            <p className="text-xs text-muted-foreground">{formatKES(result.amount)} added to the pool</p>
          </div>
        </div>
      )}

      {/* Contribute Form */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Contribution Amount (KES)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full mt-1 px-3 py-3 rounded-xl border border-input bg-background text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPayMethod('wallet')} className={`flex-1 p-2.5 rounded-xl border-2 text-center transition-colors ${payMethod === 'wallet' ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <p className="text-sm font-semibold">Wallet</p>
          </button>
          <button onClick={() => setPayMethod('mpesa')} className={`flex-1 p-2.5 rounded-xl border-2 text-center transition-colors ${payMethod === 'mpesa' ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <p className="text-sm font-semibold">M-Pesa</p>
          </button>
        </div>
        <button
          onClick={handleContribute}
          disabled={loading || !amount}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Coins className="w-5 h-5" /> Contribute</>}
        </button>
      </div>

      {/* History */}
      <div className="mt-6">
        <h2 className="text-sm font-heading font-bold mb-3">Recent Contributions</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No contributions yet</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Contribution</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(tx.created_date)}</p>
                </div>
                <p className="text-sm font-bold text-success">+{formatKES(tx.amount_cents)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <PinEntrySheet
        open={showPin}
        onClose={() => setShowPin(false)}
        onConfirm={handlePinConfirm}
        title="Enter PIN to Contribute"
      />
    </div>
  );
}
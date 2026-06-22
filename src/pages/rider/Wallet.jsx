import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES, formatDateTime } from '@/lib/format';
import { initiateStkPush, processWalletPayment, getOrCreateWallet } from '@/lib/payments';
import { verifyPin } from '@/lib/pin';
import { normalizePhone } from '@/lib/phone';
import PhoneInput from '@/components/ui/PhoneInput';
import PinEntrySheet from '@/components/rider/PinEntrySheet';
import TransactionDetailSheet from '@/components/rider/TransactionDetailSheet';
import { ArrowDownToLine, ArrowUpFromLine, Send, AlertCircle } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';

export default function Wallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const w = await getOrCreateWallet(user.id);
        setWallet(w);
        const snapshots = await base44.entities.WalletSnapshot.filter({ wallet_id: w.id });
        if (snapshots.length > 0) setBalance(snapshots[0].balance_cents || 0);
        const txns = await base44.entities.Transaction.filter({ wallet_id: w.id }, '-created_date', 20);
        setTransactions(txns);
      } catch (e) {}
      setDataLoaded(true);
    }
    loadData();
  }, [user]);

  async function handleConfirmClick() {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) return;

    // Deposit doesn't need PIN; withdraw and send do
    if (activeTab === 'deposit') {
      await processTransaction();
    } else {
      setShowPin(true);
    }
  }

  async function handlePinConfirm(pin) {
    if (!verifyPin(pin, wallet.pin_hash)) {
      throw new Error('Incorrect PIN. Try again.');
    }
    setShowPin(false);
    await processTransaction();
  }

  async function processTransaction() {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) return;
    setLoading(true);
    setResult(null);
    try {
      const phoneForSend = activeTab === 'send' ? normalizePhone(recipient) : null;

      let res;
      if (activeTab === 'deposit') {
        // Deposit = STK push from user's M-Pesa to wallet
        res = await initiateStkPush({
          walletId: wallet.id,
          phone: user.phone || user.full_name,
          amountCents: cents,
          description: 'M-Pesa top up',
          transactionType: 'deposit',
        });
      } else {
        // Send / withdraw = internal wallet operation
        res = await processWalletPayment({
          walletId: wallet.id,
          type: activeTab,
          amountCents: cents,
          counterpartyPhone: phoneForSend,
          description: activeTab === 'withdraw' ? 'Withdraw to M-Pesa' : `Send to ${recipient}`,
        });
      }
      // Re-fetch balance from server for accuracy
      const snaps = await base44.entities.WalletSnapshot.filter({ wallet_id: wallet.id });
      if (snaps.length > 0) setBalance(snaps[0].balance_cents || 0);
      setResult({ success: true, reference: res.reference, amount: cents });
      setAmount('');
      setRecipient('');
      const txns = await base44.entities.Transaction.filter({ wallet_id: wallet.id }, '-created_date', 20);
      setTransactions(txns);
    } catch (e) {
      setResult({ success: false, message: e.message || 'Something went wrong. Try again.' });
    }
    setLoading(false);
  }

  if (!dataLoaded) return <PageSkeleton variant="hero-rows" />;

  if (!wallet) {
    return (
      <div className="p-5 animate-fade-in">
        <h1 className="text-xl font-heading font-bold mb-4">Wallet</h1>
        <div className="bg-accent rounded-2xl p-6 text-center">
          <p className="text-muted-foreground text-sm mb-4">Activate your wallet to start sending and receiving money.</p>
          <Link to="/app/wallet/activate" className="inline-flex items-center justify-center bg-primary text-primary-foreground rounded-xl px-6 py-3 font-semibold text-sm">
            Activate Wallet
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'deposit', label: 'Deposit', icon: ArrowDownToLine },
    { id: 'send', label: 'Send', icon: Send },
    { id: 'withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  ];

  const needsTier2 = (activeTab === 'send' || activeTab === 'withdraw') && (wallet.tier || 0) < 2;

  return (
    <div className="p-5 animate-fade-in">
      {/* Balance Hero */}
      <div className="bg-gradient-to-br from-primary to-orange-600 text-primary-foreground rounded-2xl p-5">
        <p className="text-xs text-orange-100 uppercase tracking-wide font-medium">Balance</p>
        <p className="text-3xl font-heading font-extrabold mt-1">{formatKES(balance)}</p>
        {(wallet.tier || 0) < 2 && (
          <p className="text-[10px] text-orange-100 mt-1">Tier 1 limit: KES 5,000</p>
        )}
        <div className="flex gap-2 mt-4">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setResult(null); }}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === t.id ? 'bg-white text-primary' : 'bg-white/15 text-primary-foreground'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Form */}
      <div className="mt-5 bg-card border border-border rounded-2xl p-4">
        {needsTier2 && (
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-warning">Tier 2 Required</p>
              <p className="text-xs text-muted-foreground mt-0.5">This feature requires KYC approval (Tier 2). Upload your ID documents to unlock.</p>
            </div>
            <Link to="/app/kyc" className="flex-shrink-0 bg-warning text-warning-foreground rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap">Verify Now</Link>
          </div>
        )}
        {activeTab === 'send' && (
          <div className="mb-3">
            <PhoneInput
              value={recipient}
              onChange={setRecipient}
              label="Recipient Phone"
            />
          </div>
        )}
        <label className="text-xs font-medium text-muted-foreground">Amount (KES)</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={handleConfirmClick}
          disabled={loading || !amount || needsTier2 || (activeTab === 'send' && !normalizePhone(recipient))}
          className="w-full mt-4 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Processing...' : `Confirm ${activeTab}`}
        </button>
        {result && (
          <div className={`mt-3 p-3 rounded-xl text-sm ${result.success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {result.success ? `Success! Ref: ${result.reference}` : result.message}
          </div>
        )}
      </div>

      {/* Transaction List */}
      <div className="mt-6">
        <h2 className="text-sm font-heading font-bold mb-3">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 cursor-pointer hover:bg-accent transition-colors"
              >
                <div>
                  <p className="text-sm font-medium capitalize">{tx.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(tx.created_date)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${['deposit', 'lipisha', 'p2p_receive'].includes(tx.type) ? 'text-success' : 'text-foreground'}`}>
                    {['deposit', 'lipisha', 'p2p_receive'].includes(tx.type) ? '+' : '-'}{formatKES(tx.amount_cents)}
                  </p>
                  <span className={`text-[10px] font-medium ${
                    tx.status === 'completed' ? 'text-success'
                    : tx.status === 'initiated' || tx.status === 'pending' ? 'text-warning'
                    : 'text-destructive'
                  }`}>{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PinEntrySheet
        open={showPin}
        onClose={() => setShowPin(false)}
        onConfirm={handlePinConfirm}
        title={activeTab === 'withdraw' ? 'Enter PIN to Withdraw' : 'Enter PIN to Send'}
      />

      <TransactionDetailSheet
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  );
}
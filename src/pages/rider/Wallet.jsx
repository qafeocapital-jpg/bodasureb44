import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { formatKES, formatDateTime } from '@/lib/format';
import { mockPayment, getOrCreateWallet } from '@/lib/mockPayments';
import { ArrowDownToLine, ArrowUpFromLine, Send } from 'lucide-react';

export default function Wallet() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const u = await base44.auth.me();
        if (u) {
          setUser(u);
          const w = await getOrCreateWallet(u.id);
          setWallet(w);
          const snapshots = await base44.entities.WalletSnapshot.filter({ wallet_id: w.id });
          if (snapshots.length > 0) setBalance(snapshots[0].balance_cents || 0);
          const txns = await base44.entities.Transaction.filter({ wallet_id: w.id }, '-created_date', 20);
          setTransactions(txns);
        }
      } catch (e) {}
    }
    loadData();
  }, []);

  async function handleAction() {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await mockPayment({
        walletId: wallet.id,
        type: activeTab,
        amountCents: cents,
        counterpartyPhone: activeTab === 'send' ? recipient : null,
        description: activeTab === 'deposit' ? 'M-Pesa top up' : activeTab === 'withdraw' ? 'Withdraw to M-Pesa' : `Send to ${recipient}`,
      });
      setBalance(prev => activeTab === 'deposit' ? prev + cents : prev - cents);
      setResult({ success: true, reference: res.reference, amount: cents });
      setAmount('');
      setRecipient('');
      const txns = await base44.entities.Transaction.filter({ wallet_id: wallet.id }, '-created_date', 20);
      setTransactions(txns);
    } catch (e) {
      setResult({ success: false, message: 'Something went wrong. Try again.' });
    }
    setLoading(false);
  }

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

  return (
    <div className="p-5 animate-fade-in">
      {/* Balance Hero */}
      <div className="bg-gradient-to-br from-primary to-orange-600 text-primary-foreground rounded-2xl p-5">
        <p className="text-xs text-orange-100 uppercase tracking-wide font-medium">Balance</p>
        <p className="text-3xl font-heading font-extrabold mt-1">{formatKES(balance)}</p>
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
        {activeTab === 'send' && (
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground">Recipient Phone</label>
            <input
              type="tel"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="07XX XXX XXX"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
          onClick={handleAction}
          disabled={loading || !amount}
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
              <div key={tx.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium capitalize">{tx.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(tx.created_date)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${['deposit', 'lipisha'].includes(tx.type) ? 'text-success' : 'text-foreground'}`}>
                    {['deposit', 'lipisha'].includes(tx.type) ? '+' : '-'}{formatKES(tx.amount_cents)}
                  </p>
                  <span className="text-[10px] text-success font-medium">{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
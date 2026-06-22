import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatKES, formatDate } from '@/lib/format';
import { processWalletPayment, getWalletBalance } from '@/lib/payments';
import { verifyPin } from '@/lib/pin';
import { auditLog } from '@/lib/audit';
import PinEntrySheet from '@/components/rider/PinEntrySheet';
import { CheckCircle2, XCircle, Clock, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';

export default function Compliance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payingPenalty, setPayingPenalty] = useState(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const wallets = await base44.entities.Wallet.filter({ user_id: user.id, entity_type: 'personal' });
        const w = wallets[0];
        setWallet(w);
        if (w) {
          const bal = await getWalletBalance(w.id);
          setBalance(bal);
        }

        const checks = [
          { label: 'Profile Complete', done: user.profile_complete, link: '/app/profile' },
          { label: 'Wallet Activated', done: w?.status === 'active', link: '/app/wallet/activate' },
          { label: 'KYC Documents Uploaded', done: user.kyc_status === 'approved' || user.kyc_status === 'pending', pending: user.kyc_status === 'pending', link: '/app/kyc' },
          { label: 'KYC Approved (Tier 2)', done: user.kyc_status === 'approved', link: '/app/kyc' },
        ];

        const bikes = await base44.entities.Vehicle.filter({ rider_id: user.id });
        const approvedBike = bikes.find(b => b.status === 'approved');
        checks.push(
          { label: 'Bike Registered', done: bikes.length > 0, link: '/app/bikes/register' },
          { label: 'Bike Approved', done: !!approvedBike, link: '/app/bikes' },
        );
        if (approvedBike) {
          const permits = await base44.entities.Permit.filter({ vehicle_id: approvedBike.id, status: 'active' });
          checks.push({ label: 'Active Permit', done: permits.length > 0, link: '/app/lipa-county' });
          const policies = await base44.entities.Policy.filter({ vehicle_id: approvedBike.id, status: 'active' });
          checks.push({ label: 'Active Insurance', done: policies.length > 0, link: '/app/insurance' });
        }
        setItems(checks);

        // Load pending penalties
        const pendingPenalties = await base44.entities.Penalty.filter({ rider_id: user.id, status: 'pending' }, '-created_date', 20);
        setPenalties(pendingPenalties);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  async function handlePayPenalty(pin) {
    if (!wallet || !payingPenalty) return;
    setPaying(true);
    try {
      const cents = payingPenalty.amount_cents;
      if (balance < cents) {
        throw new Error('Insufficient wallet balance. Top up your wallet first.');
      }

      const res = await processWalletPayment({
        walletId: wallet.id,
        type: 'penalty',
        amountCents: cents,
        description: `Penalty payment: ${payingPenalty.reason}`,
        productType: 'penalty',
        feeRule: null,
        feeSplitParams: null,
      });

      if (res) {
        // Mark penalty as paid
        await base44.entities.Penalty.update(payingPenalty.id, {
          status: 'paid',
          transaction_id: res.transaction?.id || '',
          paid_at: new Date().toISOString(),
        });

        await auditLog({ userId: user.id, action: 'penalty_paid', entityType: 'Penalty', entityId: payingPenalty.id, description: `Penalty paid: ${formatKES(cents)}` });

        // Update balance
        const newBal = await getWalletBalance(wallet.id);
        setBalance(newBal);

        // Refresh penalties
        const pendingPenalties = await base44.entities.Penalty.filter({ rider_id: user.id, status: 'pending' }, '-created_date', 20);
        setPenalties(pendingPenalties);

        toast({ title: 'Penalty paid successfully', description: formatKES(cents) + ' deducted from your wallet' });
      }
    } catch (e) {
      throw new Error(e.message || 'Payment failed. Try again.');
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <PageSkeleton variant="hero-rows" />;

  const completed = items.filter(i => i.done).length;
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  return (
    <div className="p-5 animate-fade-in">
      <h1 className="text-xl font-heading font-bold mb-5">Compliance</h1>

      {/* Penalty Alert */}
      {penalties.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 className="font-heading font-bold text-sm text-destructive">Pending Penalties ({penalties.length})</h2>
          </div>
          <div className="space-y-2">
            {penalties.map(p => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{formatKES(p.amount_cents)}</p>
                  <p className="text-xs text-muted-foreground">{p.reason}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Issued: {formatDate(p.issued_at)}</p>
                </div>
                <button
                  onClick={() => setPayingPenalty(p)}
                  disabled={!wallet || wallet.status !== 'active'}
                  className="bg-destructive text-destructive-foreground rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  Pay Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Score */}
      <div className="bg-gradient-to-br from-primary to-orange-600 text-primary-foreground rounded-2xl p-5 mb-5">
        <p className="text-xs text-orange-100 uppercase tracking-wide font-medium">Compliance Score</p>
        <p className="text-3xl font-heading font-extrabold mt-1">{pct}%</p>
        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-orange-100 mt-2">{completed} of {items.length} requirements met</p>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <Link
            key={i}
            to={item.link}
            className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              {item.done ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : item.pending ? (
                <Clock className="w-5 h-5 text-warning" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {!item.done && !item.pending && (
              <span className="text-xs text-primary font-semibold">Fix →</span>
            )}
          </Link>
        ))}
      </div>

      <PinEntrySheet
        open={!!payingPenalty}
        onClose={() => setPayingPenalty(null)}
        onConfirm={handlePayPenalty}
        title="Pay Penalty"
        message={`Enter your PIN to pay ${payingPenalty ? formatKES(payingPenalty.amount_cents) : ''} from your wallet.`}
      />
    </div>
  );
}
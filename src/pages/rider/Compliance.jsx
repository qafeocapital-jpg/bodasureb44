import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatKES } from '@/lib/format';
import { processWalletPayment, getWalletBalance } from '@/lib/payments';
import { verifyPin } from '@/lib/pin';
import { auditLog } from '@/lib/audit';
import { getTaskStatuses } from '@/lib/verification';
import { computeComplianceScore } from '@/lib/compliance';
import PinEntrySheet from '@/components/rider/PinEntrySheet';
import PageSkeleton from '@/components/rider/PageSkeleton';
import ComplianceTierHero from '@/components/compliance/ComplianceTierHero';
import RiderIdentitySummary from '@/components/compliance/RiderIdentitySummary';
import ComplianceChecklist from '@/components/compliance/ComplianceChecklist';
import ComplianceTabToggle from '@/components/compliance/ComplianceTabToggle';
import CompliancePenaltyList from '@/components/compliance/CompliancePenaltyList';
import OfficerModeOverlay from '@/components/compliance/OfficerModeOverlay';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Shield } from 'lucide-react';

export default function Compliance() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Data state
  const [vehicle, setVehicle] = useState(null);
  const [kycDocs, setKycDocs] = useState([]);
  const [groupMember, setGroupMember] = useState(null);
  const [group, setGroup] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [penalties, setPenalties] = useState([]);
  const [permits, setPermits] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Computed state
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [complianceTier, setComplianceTier] = useState('Non-Compliant');
  const [complianceScore, setComplianceScore] = useState(0);

  // UI state
  const [payingPenalty, setPayingPenalty] = useState(null);
  const [paying, setPaying] = useState(false);
  const [isOfficerMode, setIsOfficerMode] = useState(false);
  const [activeTab, setActiveTab] = useState('status');

  // Load all data in parallel
  useEffect(() => {
    async function load() {
      if (!user?.id) return;
      try {
        const [vehicles, wallets, penaltiesData, kycDocsData, groupMembers, permitsData] = await Promise.all([
          base44.entities.Vehicle.filter({ rider_id: user.id }, '-created_date', 1),
          base44.entities.Wallet.filter({ user_id: user.id, entity_type: 'personal' }),
          base44.entities.Penalty.filter({ rider_id: user.id, status: 'pending' }, '-created_date', 20),
          base44.entities.KycDocument.filter({ user_id: user.id }, '-created_date'),
          base44.entities.GroupMember.filter({ user_id: user.id }),
          base44.entities.Permit.filter({ rider_id: user.id, status: 'active' }, '-created_date', 1),
        ]);

        const v = vehicles[0];
        const w = wallets[0];
        setVehicle(v);
        setWallet(w);
        setPenalties(penaltiesData);
        setKycDocs(kycDocsData);
        setGroupMember(groupMembers[0]);
        setPermits(permitsData);

        if (w) {
          const bal = await getWalletBalance(w.id);
          setBalance(bal);
        }

        if (groupMembers[0]?.group_id) {
          const g = await base44.entities.Group.get(groupMembers[0].group_id);
          setGroup(g);
        }

        const tasks = getTaskStatuses(kycDocsData, user, v);
        setTaskStatuses(tasks);
        const { score, tier } = computeComplianceScore(user, v, kycDocsData, groupMembers);
        setComplianceScore(score);
        setComplianceTier(tier);
      } catch (e) {
        console.error('Compliance load error:', e);
      }
      setLoading(false);
    }

    load();
  }, [user?.id]);

  async function handlePayPenalty(pin) {
    if (!wallet || !payingPenalty) return;
    if (!(await verifyPin(pin, wallet.id))) {
      throw new Error('Incorrect PIN. Try again.');
    }
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

      if (!res) throw new Error('Payment processing failed.');

      const transactionId = res.transaction?.id || res.id;
      await base44.entities.Penalty.update(payingPenalty.id, {
        status: 'paid',
        transaction_id: transactionId,
        paid_at: new Date().toISOString(),
      });

      await auditLog({
        userId: user.id,
        action: 'penalty_paid',
        entityType: 'Penalty',
        entityId: payingPenalty.id,
        description: `Penalty paid: ${formatKES(cents)}`,
      });

      const newBal = await getWalletBalance(wallet.id);
      setBalance(newBal);

      const pendingPenalties = await base44.entities.Penalty.filter(
        { rider_id: user.id, status: 'pending' },
        '-created_date',
        20
      );
      setPenalties(pendingPenalties);

      toast({
        title: 'Penalty paid successfully',
        description: formatKES(cents) + ' deducted from your wallet',
      });

      setPayingPenalty(null);
    } catch (e) {
      toast({
        title: 'Payment failed',
        description: e.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setPaying(false);
    }
  }

  if (loading || !user) return <PageSkeleton variant="hero-rows" />;

  if (!vehicle) {
    return (
      <div className="p-5 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">No Vehicle Registered</h2>
          <p className="text-sm text-muted-foreground mb-4">Register a bike to view compliance status.</p>
          <button
            onClick={() => navigate('/app/bikes/register')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Register Bike
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-5 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-heading font-bold">Compliance & Permits</h1>
          {(user?.role?.includes('officer') || user?.role?.includes('admin')) && (
            <button
              onClick={() => setIsOfficerMode(true)}
              className={`p-2 rounded-lg transition-all ${
                complianceTier === 'Fully Verified'
                  ? 'bg-primary text-primary-foreground animate-pulse-glow'
                  : 'bg-muted text-muted-foreground'
              }`}
              title="Show Officer Mode"
            >
              <Shield className="w-5 h-5" />
            </button>
          )}
        </div>

        <ComplianceTabToggle activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'status' && (
          <div className="space-y-5">
            <ComplianceTierHero tier={complianceTier} score={complianceScore} />
            <RiderIdentitySummary user={user} vehicle={vehicle} kycDocs={kycDocs} group={group} />
            <CompliancePenaltyList penalties={penalties} wallet={wallet} onPay={setPayingPenalty} />
          </div>
        )}

        {activeTab === 'checklist' && (
          <ComplianceChecklist
            user={user}
            vehicle={vehicle}
            taskStatuses={taskStatuses}
            wallet={wallet}
            groupMember={groupMember}
          />
        )}

        <OfficerModeOverlay
          open={isOfficerMode}
          onClose={() => setIsOfficerMode(false)}
          user={user}
          vehicle={vehicle}
          permit={permits[0] || null}
          group={group}
          kycDocs={kycDocs}
          tier={complianceTier}
        />

        <PinEntrySheet
          open={!!payingPenalty}
          onClose={() => setPayingPenalty(null)}
          onConfirm={handlePayPenalty}
          title="Pay Penalty"
          message={`Enter your PIN to pay ${
            payingPenalty ? formatKES(payingPenalty.amount_cents) : ''
          } from your wallet.`}
        />
      </div>
    </ErrorBoundary>
  );
}
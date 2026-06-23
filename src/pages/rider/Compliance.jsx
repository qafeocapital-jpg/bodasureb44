import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatKES, formatDate } from '@/lib/format';
import { processWalletPayment, getWalletBalance } from '@/lib/payments';
import { verifyPin } from '@/lib/pin';
import { auditLog } from '@/lib/audit';
import { getTaskStatuses } from '@/lib/verification';
import PinEntrySheet from '@/components/rider/PinEntrySheet';
import PageSkeleton from '@/components/rider/PageSkeleton';
import ComplianceTierHero from '@/components/compliance/ComplianceTierHero';
import RiderIdentitySummary from '@/components/compliance/RiderIdentitySummary';

import ComplianceChecklist from '@/components/compliance/ComplianceChecklist';
import OfficerModeOverlay from '@/components/compliance/OfficerModeOverlay';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AlertTriangle, Shield } from 'lucide-react';

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
        // Fetch main entities
        const [vehicles, wallets, penaltiesData, kycDocsData, groupMembers] = await Promise.all([
          base44.entities.Vehicle.filter({ rider_id: user.id }, '-created_date', 1),
          base44.entities.Wallet.filter({ user_id: user.id, entity_type: 'personal' }),
          base44.entities.Penalty.filter({ rider_id: user.id, status: 'pending' }, '-created_date', 20),
          base44.entities.KycDocument.filter({ user_id: user.id }, '-created_date'),
          base44.entities.GroupMember.filter({ user_id: user.id }),
        ]);

        const v = vehicles[0];
        const w = wallets[0];
        setVehicle(v);
        setWallet(w);
        setPenalties(penaltiesData);
        setKycDocs(kycDocsData);
        setGroupMember(groupMembers[0]);

        // Fetch wallet balance
        if (w) {
          const bal = await getWalletBalance(w.id);
          setBalance(bal);
        }



        // Fetch group name if member
        if (groupMembers[0]?.group_id) {
          const g = await base44.entities.Group.get(groupMembers[0].group_id);
          setGroup(g);
        }

        // Compute task statuses and compliance score
        const tasks = getTaskStatuses(kycDocsData, user, v);
        setTaskStatuses(tasks);
        const score = computeCompliance(user, v, w, kycDocsData, groupMembers);
      } catch (e) {
        console.error('Compliance load error:', e);
      }
      setLoading(false);
    }

    load();
  }, [user?.id]);

  function computeCompliance(usr, vhc, wlt, docs, members) {
    const scores = {
      bike_approved: vhc?.status === 'approved' ? 25 : 0,
      kyc_approved: usr?.kyc_status === 'approved' ? 25 : 0,
      id_verified: docs?.some(d => d.document_type === 'id_front' && d.status === 'approved') && docs?.some(d => d.document_type === 'id_back' && d.status === 'approved') ? 25 : 0,
      sacco_member: members?.length > 0 ? 25 : 0,
    };

    const score = Object.values(scores).reduce((a, b) => a + b, 0);
    setComplianceScore(score);

    if (score >= 85) setComplianceTier('Fully Verified');
    else if (score >= 65) setComplianceTier('Road-Ready');
    else if (score >= 40) setComplianceTier('Partial');
    else setComplianceTier('Non-Compliant');
  
    return score;
  }

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

      // Process payment atomically
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

      // Only mark paid if transaction succeeded
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

      // Fetch next batch with pagination (up to 20 pending)
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

        {/* Pill Toggle at Top */}
        <div className="flex gap-2 mb-6 bg-[#F0F0F0] p-1 rounded-full w-full">
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-2 px-4 rounded-full font-bold text-sm transition-all ${
              activeTab === 'status'
                ? 'bg-[#EA580C] text-white'
                : 'bg-transparent text-[#666]'
            }`}
          >
            My Status
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`flex-1 py-2 px-4 rounded-full font-bold text-sm transition-all ${
              activeTab === 'checklist'
                ? 'bg-[#EA580C] text-white'
                : 'bg-transparent text-[#666]'
            }`}
          >
            Checklist
          </button>
        </div>

        {/* Tab 1: My Status */}
        {activeTab === 'status' && (
          <div className="space-y-5">
            {/* Compliance Tier Hero */}
            <ComplianceTierHero tier={complianceTier} score={complianceScore} />

            {/* Rider Identity Summary */}
            <RiderIdentitySummary
              user={user}
              vehicle={vehicle}
              kycDocs={kycDocs}
              group={group}
            />



            {/* Pending Penalties */}
            {penalties.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <h2 className="font-heading font-bold text-sm text-destructive">
                    Pending Penalties ({penalties.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {penalties.map((p) => (
                    <div
                      key={p.id}
                      className="bg-card border border-border rounded-xl p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold">{formatKES(p.amount_cents)}</p>
                        <p className="text-xs text-muted-foreground">{p.reason}</p>
                        {p.created_date && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Issued: {formatDate(p.created_date)}
                          </p>
                        )}
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
          </div>
        )}

        {/* Tab 2: Checklist */}
        {activeTab === 'checklist' && (
          <ComplianceChecklist
            user={user}
            vehicle={vehicle}
            taskStatuses={taskStatuses}
            wallet={wallet}
            groupMember={groupMember}
          />
        )}

        {/* Officer Mode Overlay */}
        <OfficerModeOverlay
          open={isOfficerMode}
          onClose={() => setIsOfficerMode(false)}
          user={user}
          vehicle={vehicle}
          permit={null}
          group={group}
          kycDocs={kycDocs}
          tier={complianceTier}
        />

        {/* PIN Entry Sheet for Penalties */}
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
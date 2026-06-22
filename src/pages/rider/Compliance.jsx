import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatKES, formatDate } from '@/lib/format';
import { processWalletPayment, getWalletBalance } from '@/lib/payments';
import { verifyPin } from '@/lib/pin';
import { auditLog } from '@/lib/audit';
import { getTaskStatuses } from '@/lib/verification';
import { differenceInDays } from 'date-fns';
import PinEntrySheet from '@/components/rider/PinEntrySheet';
import PageSkeleton from '@/components/rider/PageSkeleton';
import ComplianceTierHero from '@/components/compliance/ComplianceTierHero';
import RiderIdentitySummary from '@/components/compliance/RiderIdentitySummary';
import PermitInsuranceCards from '@/components/compliance/PermitInsuranceCards';
import ComplianceChecklist from '@/components/compliance/ComplianceChecklist';
import OfficerModeOverlay from '@/components/compliance/OfficerModeOverlay';
import { AlertTriangle, Shield } from 'lucide-react';

export default function Compliance() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Data state
  const [vehicle, setVehicle] = useState(null);
  const [permits, setPermits] = useState([]);
  const [policies, setPolicies] = useState([]);
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

        // Fetch permits and policies if bike exists
        let perms = [];
        let pols = [];
        if (v?.id) {
          const results = await Promise.all([
            base44.entities.Permit.filter({ vehicle_id: v.id, status: 'active' }, '-created_date', 1),
            base44.entities.Policy.filter({ vehicle_id: v.id, status: 'active' }, '-created_date', 1),
          ]);
          perms = results[0];
          pols = results[1];
          setPermits(perms);
          setPolicies(pols);
        }

        // Fetch group name if member
        if (groupMembers[0]?.group_id) {
          const g = await base44.entities.Group.get(groupMembers[0].group_id);
          setGroup(g);
        }

        // Fetch county name if vehicle exists
        let countyName = '';
        if (v?.county_id) {
          try {
            const countyData = await base44.entities.County.get(v.county_id);
            countyName = countyData?.name || '';
          } catch (e) {
            console.warn('County fetch failed:', e);
          }
        }

        // Fetch stage name if vehicle has stage_id
        let stageName = '';
        if (v?.stage_id) {
          try {
            const stageData = await base44.entities.Stage.get(v.stage_id);
            stageName = stageData?.name || '';
          } catch (e) {
            console.warn('Stage fetch failed:', e);
          }
        }

        // Compute task statuses and compliance score
        const tasks = getTaskStatuses(kycDocsData, user, v);
        setTaskStatuses(tasks);
        computeCompliance(user, v, w, kycDocsData, groupMembers, perms, pols);
      } catch (e) {
        console.error('Compliance load error:', e);
      }
      setLoading(false);
    }

    load();
  }, [user?.id]);

  function computeCompliance(usr, vhc, wlt, docs, members, perms, pols) {
    const scores = {
      bike_approved: vhc?.status === 'approved' ? 25 : 0,
      active_permit: perms?.length > 0 ? 25 : 0,
      kyc_approved: usr?.kyc_status === 'approved' ? 20 : 0,
      id_verified: docs?.some(d => d.document_type === 'id_front' && d.status === 'approved') && docs?.some(d => d.document_type === 'id_back' && d.status === 'approved') ? 15 : 0,
      insurance_active: pols?.length > 0 ? 10 : 0,
      sacco_member: members?.length > 0 ? 5 : 0,
    };

    const score = Object.values(scores).reduce((a, b) => a + b, 0);
    setComplianceScore(score);

    if (score >= 85) setComplianceTier('Fully Verified');
    else if (score >= 65) setComplianceTier('Road-Ready');
    else if (score >= 40) setComplianceTier('Partial');
    else setComplianceTier('Non-Compliant');
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
        await base44.entities.Penalty.update(payingPenalty.id, {
          status: 'paid',
          transaction_id: res.transaction?.id || '',
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
      }
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

  const activePermit = permits[0];
  const activePolicy = policies[0];
  
  // Recalculate days remaining on each render to keep countdowns current
  const permitDaysRemaining = activePermit ? Math.max(-1, differenceInDays(new Date(activePermit.end_date), new Date())) : null;
  const insuranceDaysRemaining = activePolicy ? Math.max(-1, differenceInDays(new Date(activePolicy.end_date), new Date())) : null;

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-heading font-bold">Compliance & Permits</h1>
        <button
          onClick={() => setIsOfficerMode(true)}
          className={`p-2 rounded-lg transition-all ${
            complianceScore === 100
              ? 'bg-primary text-primary-foreground animate-pulse-glow'
              : 'bg-muted text-muted-foreground'
          }`}
          title="Show Officer Mode"
        >
          <Shield className="w-5 h-5" />
        </button>
      </div>

      {/* Compliance Tier Hero */}
      <ComplianceTierHero tier={complianceTier} score={complianceScore} />

      {/* Rider Identity Summary */}
      <RiderIdentitySummary
        user={user}
        vehicle={vehicle}
        kycDocs={kycDocs}
        group={group}
      />

      {/* Permit & Insurance Status */}
      <PermitInsuranceCards
        permit={activePermit}
        policy={activePolicy}
        permitDaysRemaining={permitDaysRemaining}
        insuranceDaysRemaining={insuranceDaysRemaining}
      />

      {/* Pending Penalties */}
      {penalties.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 mb-5">
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
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Issued: {formatDate(p.issued_at)}
                  </p>
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

      {/* Full Compliance Checklist */}
      <ComplianceChecklist
        user={user}
        vehicle={vehicle}
        taskStatuses={taskStatuses}
        wallet={wallet}
        groupMember={groupMember}
      />

      {/* Officer Mode Overlay */}
      <OfficerModeOverlay
        open={isOfficerMode}
        onClose={() => setIsOfficerMode(false)}
        user={user}
        vehicle={vehicle}
        permit={activePermit}
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
  );
}
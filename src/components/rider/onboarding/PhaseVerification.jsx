import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, ChevronRight, ChevronLeft, ArrowRight, CheckCircle2, CreditCard, Bike, UserCircle, Smartphone, UserCheck, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import VerificationMiniStepper from '@/components/rider/onboarding/VerificationMiniStepper';
import VerificationComplete from '@/components/rider/onboarding/VerificationComplete';
import SubTaskIdentity from '@/components/rider/onboarding/verification/SubTaskIdentity';
import SubTaskBikePhotos from '@/components/rider/onboarding/verification/SubTaskBikePhotos';
import SubTaskPhoneOTP from '@/components/rider/onboarding/verification/SubTaskPhoneOTP';
import SubTaskOwner from '@/components/rider/onboarding/verification/SubTaskOwner';
import { ReadOnlyBanner, ReadOnlyBackButton } from '@/components/rider/onboarding/ReadOnlyBanner';
import { VERIFICATION_TASKS, getTaskStatuses, isAllSubmitted, TASK_STATUS_CONFIG } from '@/lib/verification';
import TierBenefitsCard from '@/components/rider/TierBenefitsCard';
import { getKycLevel } from '@/components/ui/KycLevelBadge';

const TASK_ICONS = [CreditCard, Bike, Smartphone, UserCheck];

export default function PhaseVerification({ user, vehicle, wallet, onCompleted, onBack, readOnly, onExitReadOnly }) {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [kycDocs, setKycDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const docs = await base44.entities.KycDocument.filter({ user_id: user.id });
      setKycDocs(docs);
      if (refreshUser) await refreshUser();
    } catch (e) {}
  }, [user.id, refreshUser]);

  useEffect(() => {
    async function load() {
      await refreshData();
      setLoading(false);
    }
    load();
  }, []);

  // Clear kyc_just_approved flag after showing the celebration banner
  useEffect(() => {
    if (user?.kyc_just_approved) {
      base44.auth.updateMe({ kyc_just_approved: false }).then(() => refreshUser?.()).catch(() => {});
    }
  }, [user?.kyc_just_approved]);

  // Check completion state
  const tasks = getTaskStatuses(kycDocs, user, vehicle);
  const submitted = isAllSubmitted(tasks);

  useEffect(() => {
    if (submitted && !allDone) {
      setAllDone(true);
    }
  }, [submitted, allDone]);

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await base44.functions.invoke('completeVerification', {});
      if (res.data?.verification_complete) {
        await refreshData();
        onCompleted?.();
      } else {
        // Not all tasks done — refresh to show current state
        await refreshData();
      }
    } catch (e) {}
    setCompleting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Wallet activation gate — must activate wallet before KYC
  const walletActive = wallet && wallet.status === 'active' && wallet.tier >= 1;
  if (!readOnly && !walletActive) {
    return (
      <div className="space-y-4">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Wallet className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-heading font-bold text-lg mb-1">Activate Your BodaSure Wallet First</h3>
          <p className="text-sm text-muted-foreground mb-4">You need an active BodaSure Wallet before completing KYC verification. Activation takes less than a minute.</p>
          <button onClick={() => navigate('/app/wallet/activate')} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm">
            <Wallet className="w-4 h-4" /> Activate Wallet
          </button>
        </div>
        {kycDocs.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Previously Uploaded Documents</p>
            <div className="space-y-2">
              {kycDocs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between text-xs">
                  <span className="capitalize">{doc.document_type.replace(/_/g, ' ')}</span>
                  <span className={`font-semibold ${doc.status === 'approved' ? 'text-success' : doc.status === 'rejected' ? 'text-destructive' : 'text-warning'}`}>{doc.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={() => navigate('/app')} className="w-full text-center text-sm text-muted-foreground font-semibold py-2">Go to Dashboard</button>
      </div>
    );
  }

  // If verification already complete
  if (user?.verification_complete && !readOnly) {
    return <VerificationComplete onDone={() => navigate('/app')} />;
  }

  // If all tasks submitted, show completion card
  if (allDone && !readOnly) {
    return (
      <div className="space-y-4">
        <div className="bg-success/5 border border-success/20 rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-3" />
          <p className="text-sm font-semibold text-success mb-1">All verification tasks submitted!</p>
          <p className="text-xs text-muted-foreground">Tap below to complete your verification.</p>
        </div>
        <button
          onClick={handleComplete}
          disabled={completing}
          className="w-full flex items-center justify-center gap-1 bg-success text-success-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
        >
          {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Complete Verification <ChevronRight className="w-4 h-4" /></>}
        </button>
        <button
          onClick={() => navigate('/app')}
          className="w-full text-center text-sm text-muted-foreground font-semibold py-2"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  // Render active sub-task
  const renderSubTask = () => {
    const props = { user, vehicle, kycDocs, onDataChange: refreshData, onBack: () => setActiveTask(null) };
    switch (activeTask) {
      case 0: return <SubTaskIdentity {...props} />;
      case 1: return <SubTaskBikePhotos {...props} />;
      case 2: return <SubTaskPhoneOTP {...props} />;
      case 3: return <SubTaskOwner {...props} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {readOnly && <ReadOnlyBanner />}
      {user?.kyc_just_approved && (
        <div className="bg-success/5 border border-success/20 rounded-2xl p-4 text-center animate-fade-in">
          <CheckCircle2 className="w-8 h-8 mx-auto text-success mb-2" />
          <p className="text-sm font-bold text-success">KYC Approved — Tier 2 Unlocked!</p>
          <p className="text-xs text-muted-foreground mt-1">You can now send money, withdraw, and access all services.</p>
        </div>
      )}
      {getKycLevel(user) < 2 && <TierBenefitsCard />}
      {/* Header */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
        <p className="text-sm font-semibold text-primary">Verification</p>
        <p className="text-[10px] text-muted-foreground">Complete at your own pace — you can access the app anytime.</p>
      </div>

      {/* Mini stepper */}
      <VerificationMiniStepper tasks={tasks} activeIndex={activeTask ?? -1} onSelect={readOnly ? undefined : (i => setActiveTask(i))} />

      {/* Sub-task list or detail */}
      {activeTask !== null ? (
        renderSubTask()
      ) : (
        <div className="space-y-2">
          {VERIFICATION_TASKS.map((task, i) => {
            const status = tasks[i]?.status || 'not_started';
            const config = TASK_STATUS_CONFIG[status];
            const Icon = TASK_ICONS[i];
            return (
              <button
                key={task.id}
                onClick={() => !readOnly && setActiveTask(i)}
                disabled={readOnly}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 text-left hover:bg-accent/50 transition-colors"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                  <Icon className={`w-4 h-4 ${config.className}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{task.name}</p>
                  <p className={`text-[10px] ${config.className}`}>{config.label}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Back to Tasks (during sub-task) / Go to Dashboard (at task list) */}
      {activeTask !== null ? (
        <button
          onClick={() => setActiveTask(null)}
          className="w-full flex items-center justify-center gap-1.5 bg-muted text-foreground rounded-xl py-3 font-semibold text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Tasks
        </button>
      ) : !readOnly ? (
        <button
          onClick={() => navigate('/app')}
          className="w-full flex items-center justify-center gap-1 border border-border rounded-xl py-3 font-semibold text-sm"
        >
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <ReadOnlyBackButton onExit={onExitReadOnly} />
      )}
    </div>
  );
}
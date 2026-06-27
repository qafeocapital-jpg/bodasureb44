import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, ChevronRight, ChevronLeft, ArrowRight, CheckCircle2, XCircle, CreditCard, Bike, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import VerificationMiniStepper from '@/components/rider/onboarding/VerificationMiniStepper';
import VerificationComplete from '@/components/rider/onboarding/VerificationComplete';
import SubTaskIdentity from '@/components/rider/onboarding/verification/SubTaskIdentity';
import SubTaskBikePhotos from '@/components/rider/onboarding/verification/SubTaskBikePhotos';
import SubTaskOwner from '@/components/rider/onboarding/verification/SubTaskOwner';
import { ReadOnlyBanner, ReadOnlyBackButton } from '@/components/rider/onboarding/ReadOnlyBanner';
import { VERIFICATION_TASKS, getTaskStatuses, TASK_STATUS_CONFIG } from '@/lib/verification';
import TierBenefitsCard from '@/components/rider/TierBenefitsCard';
import { getKycLevel } from '@/components/ui/KycLevelBadge';

const TASK_ICONS = [CreditCard, Bike, UserCheck];

export default function PhaseVerification({ user, vehicle, wallet, onCompleted, onBack, readOnly, onExitReadOnly }) {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [kycDocs, setKycDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [completing, setCompleting] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const docs = await base44.entities.KycDocument.filter({ user_id: user.id });
      setKycDocs(docs);
      if (refreshUser) await refreshUser();
    } catch (e) {}
  }, [user.id, refreshUser]);

  // GAP 3: Silent auto-refresh on mount - always fetch fresh user data
  // This covers the case where IDAnalyzer webhook fires after the polling window expired
  useEffect(() => {
    let mounted = true;
    async function load() {
      await refreshData();
      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [refreshData]);

  // GAP 3: Additional refresh if user is in KYC_REVIEW state with no decision yet
  // Re-fetch on every mount to catch late webhook arrivals
  useEffect(() => {
    if (user?.account_state === 'KYC_REVIEW' && !user?.docupass_decision) {
      refreshData();
    }
  }, [user?.account_state, user?.docupass_decision, refreshData]);

  // Clear kyc_just_approved flag after showing the celebration banner
  const clearingFlag = useRef(false);
  useEffect(() => {
    if (user?.kyc_just_approved && !clearingFlag.current) {
      clearingFlag.current = true;
      base44.auth.updateMe({ kyc_just_approved: false }).then(() => refreshUser?.()).catch(() => {}).finally(() => {
        clearingFlag.current = false;
      });
    }
  }, [user?.kyc_just_approved, refreshUser]);

  // Check completion state — all tasks must be admin-verified (not just submitted)
  const tasks = getTaskStatuses(kycDocs, user, vehicle, wallet);
  const allVerified = tasks.length > 0 && tasks.every(t => t.status === 'verified');
  const allSubmittedNotVerified = tasks.length > 0 && tasks.every(t => t.status === 'submitted' || t.status === 'verified') && !allVerified;
  
  // KYC rejection state
  const identityTask = tasks.find(t => t.id === 'identity');
  const identityRejected = identityTask?.status === 'rejected';
  const kycAttemptsRemaining = 3 - (user?.kyc_attempts || 0);
  const identityUnderReview = user?.docupass_decision === 'review' || user?.kyc_status === 'pending';

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



  // If verification already complete
  if (user?.verification_complete && !readOnly) {
    return <VerificationComplete onDone={() => navigate('/app')} />;
  }

  // Identity rejected - show retry UI
  if (identityRejected && !readOnly) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 text-center">
          <XCircle className="w-12 h-12 mx-auto text-destructive mb-3" />
          <p className="text-sm font-semibold text-destructive mb-1">Identity Verification Failed</p>
          {kycAttemptsRemaining > 0 ? (
            <>
              <p className="text-xs text-muted-foreground mb-4">{kycAttemptsRemaining} attempt(s) remaining</p>
              <button
                onClick={() => setActiveTask(0)}
                className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm"
              >
                Try Again <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-4">Maximum attempts reached — our team will review your case.</p>
              <a
                href="mailto:help@bodasure.com"
                className="w-full flex items-center justify-center gap-1 bg-muted text-foreground rounded-xl py-3 font-semibold text-sm"
              >
                Contact Support
              </a>
            </>
          )}
        </div>
        <button
          onClick={() => navigate('/app')}
          className="w-full text-center text-sm text-muted-foreground font-semibold py-2"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  // If all tasks verified, show completion card
  if (allVerified && !readOnly) {
    return (
      <div className="space-y-4">
        <div className="bg-success/5 border border-success/20 rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-3" />
          <p className="text-sm font-semibold text-success mb-1">All verification tasks approved!</p>
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
      case 2: return <SubTaskOwner {...props} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {readOnly && <ReadOnlyBanner />}
      {identityUnderReview && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-amber-600 animate-spin flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium">Your identity is under manual review. We'll notify you within 48 hours.</p>
        </div>
      )}
      {allSubmittedNotVerified && !identityUnderReview && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
          <p className="text-xs text-blue-700 font-medium">Your photos are under review — you'll be notified by SMS once approved.</p>
        </div>
      )}
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
                  <p className={`text-[10px] ${config.className}`}>
                    {config.label}
                  </p>
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
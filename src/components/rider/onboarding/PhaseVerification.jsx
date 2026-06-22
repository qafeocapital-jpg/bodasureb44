import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, ChevronRight, ArrowRight, CheckCircle2, CreditCard, Bike, UserCircle, Smartphone, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import VerificationMiniStepper from '@/components/rider/onboarding/VerificationMiniStepper';
import VerificationComplete from '@/components/rider/onboarding/VerificationComplete';
import SubTaskID from '@/components/rider/onboarding/verification/SubTaskID';
import SubTaskBikePhotos from '@/components/rider/onboarding/verification/SubTaskBikePhotos';
import SubTaskSelfie from '@/components/rider/onboarding/verification/SubTaskSelfie';
import SubTaskPhoneOTP from '@/components/rider/onboarding/verification/SubTaskPhoneOTP';
import SubTaskOwner from '@/components/rider/onboarding/verification/SubTaskOwner';
import { ReadOnlyBanner, ReadOnlyBackButton } from '@/components/rider/onboarding/ReadOnlyBanner';
import { VERIFICATION_TASKS, getTaskStatuses, isAllSubmitted, TASK_STATUS_CONFIG } from '@/lib/verification';

const TASK_ICONS = [CreditCard, Bike, UserCircle, Smartphone, UserCheck];

export default function PhaseVerification({ user, vehicle, onCompleted, onBack, readOnly, onExitReadOnly }) {
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
      case 0: return <SubTaskID {...props} />;
      case 1: return <SubTaskBikePhotos {...props} />;
      case 2: return <SubTaskSelfie {...props} />;
      case 3: return <SubTaskPhoneOTP {...props} />;
      case 4: return <SubTaskOwner {...props} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {readOnly && <ReadOnlyBanner />}
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

      {/* Go to Dashboard — always visible */}
      {!readOnly && (
      <button
        onClick={() => navigate('/app')}
        className="w-full flex items-center justify-center gap-1 border border-border rounded-xl py-3 font-semibold text-sm"
      >
        Go to Dashboard <ArrowRight className="w-4 h-4" />
      </button>
      )}
      {readOnly && <ReadOnlyBackButton onExit={onExitReadOnly} />}
    </div>
  );
}
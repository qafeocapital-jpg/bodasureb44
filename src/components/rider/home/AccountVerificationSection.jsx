import { useNavigate } from 'react-router-dom';
import {
  User, Bike, MapPin, Users, ShieldCheck, Camera, UserCheck, Truck,
  CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import { getOnboardingPhase } from '@/lib/onboarding';
import { getTaskStatuses } from '@/lib/verification';
import { tileColors } from '@/lib/riderTiles';

const STEPS = [
  { label: 'Profile', icon: User, color: 'orange', type: 'onboarding', phase: 0 },
  { label: 'Register Bike', icon: Bike, color: 'blue', type: 'onboarding', phase: 1 },
  { label: 'Map Location', icon: MapPin, color: 'violet', type: 'onboarding', phase: 2 },
  { label: 'Join SACCO', icon: Users, color: 'teal', type: 'onboarding', phase: 3 },
  { label: 'ID Verify', icon: ShieldCheck, color: 'emerald', type: 'verification', taskId: 'identity' },
  { label: 'Bike Photos', icon: Camera, color: 'sky', type: 'verification', taskId: 'bike' },
  { label: 'Owner Verify', icon: UserCheck, color: 'amber', type: 'verification', taskId: 'owner' },
  { label: 'Register Tuktuk', icon: Truck, color: 'slate', type: 'soon' },
];

// Map raw task status → display state: 'locked' | 'active' | 'pending_review' | 'complete' | 'rejected'
function mapTaskStatus(status) {
  switch (status) {
    case 'verified': return 'complete';
    case 'in_progress': return 'active';
    case 'submitted': return 'pending_review';
    case 'rejected': return 'rejected';
    default: return 'locked';
  }
}

function StatusBadge({ state }) {
  const config = {
    complete: { icon: CheckCircle2, cls: 'bg-green-500 text-white' },
    active: { icon: Clock, cls: 'bg-amber-400 text-amber-950' },
    pending_review: { icon: Clock, cls: 'bg-blue-500 text-white' },
    rejected: { icon: XCircle, cls: 'bg-destructive text-white' },
  };
  const c = config[state];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <span className={`absolute -top-2 -right-2 rounded-full p-0.5 ${c.cls}`}>
      <Icon className="w-3 h-3" />
    </span>
  );
}

function labelColorClass(state) {
  switch (state) {
    case 'complete': return 'text-success';
    case 'active': return 'text-warning';
    case 'pending_review': return 'text-blue-600';
    case 'rejected': return 'text-destructive';
    default: return 'text-slate-400';
  }
}

export default function AccountVerificationSection({ user, bikes, kycDocs, groupMembers, wallet }) {
  const navigate = useNavigate();
  const phase = getOnboardingPhase(user, bikes, groupMembers, wallet);
  const tasks = getTaskStatuses(kycDocs, user, bikes?.[0]);

  // Hidden entirely once fully verified
  if (phase >= 5 && user?.verification_complete) return null;

  let completedCount = 0;
  const rows = STEPS.map((step) => {
    let state;
    if (step.type === 'soon') {
      state = 'soon';
    } else if (step.type === 'onboarding') {
      if (phase > step.phase) { state = 'complete'; completedCount++; }
      else if (phase === step.phase) state = 'active';
      else state = 'locked';
    } else {
      // verification steps — locked unless phase >= 4
      if (phase < 4) {
        state = 'locked';
      } else {
        const task = tasks.find(t => t.id === step.taskId);
        const mapped = mapTaskStatus(task?.status || 'not_started');
        state = mapped;
        if (mapped === 'complete') completedCount++;
      }
    }
    return { ...step, state };
  });

  const handleTap = (step) => {
    if (step.type === 'soon') return;
    const { state } = step;
    if (state === 'locked') return;
    if (step.type === 'onboarding') {
      if (state === 'complete') {
        navigate('/app/profile', { state: { viewStep: step.phase } });
      } else {
        navigate('/app/profile', { state: { targetPhase: step.phase } });
      }
    } else if (step.type === 'verification') {
      navigate('/app/profile', { state: { targetPhase: 4 } });
    }
  };

  return (
    <div className="px-4 pt-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-1 px-1">
        <h2 className="text-sm font-heading font-bold text-foreground">My Account Verification</h2>
        <span className="text-xs font-semibold text-primary">{completedCount} of 7 complete</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3 px-1">
        Complete your account to grow and earn more with BodaSure.
      </p>

      {/* Icon grid */}
      <div className="grid grid-cols-4 gap-3">
        {rows.map((step) => {
          const Icon = step.icon;
          const isSoon = step.state === 'soon';
          const isLocked = step.state === 'locked';
          const isGrey = isSoon || isLocked;
          const tappable = !isSoon && !isLocked;
          const cls = isGrey
            ? 'bg-slate-100 text-slate-400'
            : tileColors[step.color];
          return (
            <button
              key={step.label}
              type="button"
              disabled={!tappable}
              onClick={() => handleTap(step)}
              className={`flex flex-col items-center gap-1.5 ${tappable ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
            >
              <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-150 ease-out ${cls}`}>
                <Icon className="w-6 h-6" strokeWidth={2} />
                {!isGrey && <StatusBadge state={step.state} />}
                {isSoon && (
                  <span className="absolute -top-1 -right-1 bg-amber-400 text-[8px] font-bold text-amber-950 rounded-full px-1.5 py-0.5 leading-none">
                    SOON
                  </span>
                )}
              </div>
              <span className={`text-[10px] text-center font-medium leading-tight ${isGrey ? 'text-slate-400' : labelColorClass(step.state)}`}>
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
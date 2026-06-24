import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { ONBOARDING_PHASES } from '@/lib/onboarding';

export default function ProgressBar({ currentPhase, completedPhase, onJumpBack, onboardingComplete }) {
  const isDone = currentPhase >= 6;
  const activePhase = isDone ? null : ONBOARDING_PHASES[currentPhase];

  return (
    <div className="space-y-3">
      {/* Current Phase Banner */}
      <div className={`rounded-xl px-4 py-3 ${isDone ? 'bg-success/10' : 'bg-primary/5'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isDone ? (
              <Check className="w-5 h-5 text-success" strokeWidth={3} />
            ) : (
              <activePhase.icon className="w-5 h-5 text-primary" />
            )}
            <div>
              <p className={`text-sm font-heading font-bold ${isDone ? 'text-success' : 'text-primary'}`}>
                {isDone ? 'Setup Complete!' : activePhase.name}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">
                {isDone ? 'You can now access all features' : `Step ${currentPhase + 1} of 6`}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-muted-foreground">
            {isDone ? '6/6' : `${currentPhase + 1}/6`}
          </span>
        </div>
      </div>

      {/* Compact Stepper */}
      <div className="flex items-center">
        {ONBOARDING_PHASES.map((phase, i) => {
          const isCompleted = i < completedPhase;
          const isActive = i === currentPhase;
          const Icon = phase.icon;
          return (
            <Fragment key={phase.id}>
              <button
                onClick={() => isCompleted && onJumpBack ? onJumpBack(i) : null}
                disabled={!isCompleted}
                className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
                  isCompleted
                    ? `bg-success text-success-foreground pointer-events-none cursor-default opacity-100`
                    : isActive
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-card text-muted-foreground border-2 border-border'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" strokeWidth={3} /> : <Icon className="w-4 h-4" />}
              </button>
              {i < ONBOARDING_PHASES.length - 1 && (
                <div className={`flex-1 h-1 mx-0.5 rounded-full transition-colors ${i < completedPhase ? 'bg-primary' : 'bg-border'}`} />
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Phase Labels */}
      <div className="flex justify-between px-0.5">
        {ONBOARDING_PHASES.map((phase, i) => {
          const isCompleted = i < completedPhase;
          const isActive = i === currentPhase;
          return (
            <span
              key={phase.id}
              className={`text-[9px] font-medium text-center transition-colors ${
                isCompleted
                  ? 'text-muted-foreground opacity-50'
                  : isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground/60'
              }`}
              style={{ width: `${100 / ONBOARDING_PHASES.length}%` }}
            >
              {phase.short}
            </span>
          );
        })}
      </div>
    </div>
  );
}
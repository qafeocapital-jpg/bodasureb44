import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { ONBOARDING_PHASES } from '@/lib/onboarding';

export default function ProgressBar({ currentPhase, onJumpBack }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center">
        {ONBOARDING_PHASES.map((phase, i) => {
          const isCompleted = i < currentPhase;
          const isActive = i === currentPhase;
          return (
            <Fragment key={phase.id}>
              <button
                onClick={() => isCompleted && onJumpBack ? onJumpBack(i) : null}
                disabled={!isCompleted}
                className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground cursor-pointer hover:scale-110'
                    : isActive
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-card text-muted-foreground border-2 border-border'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
              </button>
              {i < ONBOARDING_PHASES.length - 1 && (
                <div className={`flex-1 h-1 mx-0.5 rounded-full transition-colors ${i < currentPhase ? 'bg-primary' : 'bg-border'}`} />
              )}
            </Fragment>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center font-medium">
        {currentPhase >= 5
          ? '✅ All steps complete!'
          : `Phase ${currentPhase + 1} of 5 · ${ONBOARDING_PHASES[currentPhase].name}`}
      </p>
    </div>
  );
}
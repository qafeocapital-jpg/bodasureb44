import { Check, ChevronRight, Clock } from 'lucide-react';
import { ONBOARDING_PHASES } from '@/lib/onboarding';

export default function CompletionScreen({ onDone, verificationComplete }) {
  return (
    <div className="text-center py-6 animate-fade-in">
      <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5">
        <Check className="w-12 h-12 text-success" strokeWidth={3} />
      </div>
      <h2 className="font-heading font-bold text-xl mb-2">You're All Set! 🎉</h2>
      <p className="text-sm text-muted-foreground mb-6">Your account is fully configured and ready to go.</p>

      <div className="space-y-2 mb-8 text-left">
        {ONBOARDING_PHASES.map(phase => {
          const isVerification = phase.id === 5;
          const isComplete = !isVerification || verificationComplete;
          return (
            <div key={phase.id} className={`flex items-center gap-3 bg-card border rounded-xl px-4 py-2.5 ${isComplete ? 'border-success/20' : 'border-amber-200'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isComplete ? 'bg-success/10' : 'bg-amber-50'}`}>
                {isComplete ? <Check className="w-4 h-4 text-success" strokeWidth={3} /> : <Clock className="w-4 h-4 text-amber-500" />}
              </div>
              <div>
                <p className="text-sm font-medium">{phase.name}</p>
                <p className={`text-[10px] ${isComplete ? 'text-success' : 'text-amber-600'}`}>
                  {isComplete ? 'Complete' : 'Optional — Complete anytime'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onDone}
        className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm"
      >
        Go to Dashboard <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
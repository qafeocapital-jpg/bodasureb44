import { Check, ChevronRight, ShieldCheck } from 'lucide-react';
import { VERIFICATION_TASKS } from '@/lib/verification';

export default function VerificationComplete({ onDone }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center py-4">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-10 h-10 text-success" strokeWidth={2.5} />
        </div>
        <h2 className="font-heading font-bold text-lg mb-1">Verification Complete! ✅</h2>
        <p className="text-xs text-muted-foreground">
          All verification tasks have been submitted. Your profile is now more trustworthy.
        </p>
      </div>

      <div className="space-y-2">
        {VERIFICATION_TASKS.map(task => (
          <div key={task.id} className="flex items-center gap-3 bg-card border border-success/20 rounded-xl px-4 py-2.5">
            <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <Check className="w-3.5 h-3.5 text-success" strokeWidth={3} />
            </div>
            <p className="text-sm font-medium">{task.name}</p>
            <span className="ml-auto text-[10px] text-success font-semibold">Done</span>
          </div>
        ))}
      </div>

      <button
        onClick={onDone}
        className="w-full flex items-center justify-center gap-1 bg-success text-success-foreground rounded-xl py-3 font-semibold text-sm"
      >
        Go to Dashboard <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
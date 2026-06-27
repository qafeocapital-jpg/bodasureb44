import { useState } from 'react';
import { Lock, CheckCircle2, ChevronDown } from 'lucide-react';

const BENEFITS = [
  { emoji: '🏦', label: 'Loans' },
  { emoji: '🏛️', label: 'County Recognition' },
  { emoji: '🤝', label: 'Chama' },
  { emoji: '🛡️', label: 'Insurance' },
  { emoji: '💸', label: 'Collect Fares' },
  { emoji: '🌍', label: 'Full Identity' },
];

export default function WizardStepCard({ step, index, status, onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = step.icon;
  const isComplete = status === 'complete';
  const isInProgress = status === 'in_progress';

  return (
    <div className="rounded-2xl border border-border p-4 bg-card">
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${step.color}`}>
            <Icon className="w-6 h-6" />
          </div>
          {isComplete && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center border-2 border-card">
              <CheckCircle2 className="w-3.5 h-3.5 text-success-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Step {index + 1}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              isComplete ? 'bg-success/10 text-success' : isInProgress ? 'bg-amber-50 text-amber-600' : 'bg-muted text-muted-foreground'
            }`}>
              {isComplete ? 'Complete' : isInProgress ? 'In Progress' : 'Not Started'}
            </span>
          </div>
          <h3 className="font-heading font-bold text-sm text-foreground">{step.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {isComplete
              ? <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
              : <Lock className="w-3 h-3 flex-shrink-0" />}
            <span className="font-medium">Unlock loans, insurance, county recognition & more</span>
          </p>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        What you unlock
      </button>
      {expanded && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {BENEFITS.map(b => (
            <span key={b.label} className="text-[10px] px-2 py-1 rounded-full bg-muted/60 text-muted-foreground flex items-center gap-1">
              <span>{b.emoji}</span> {b.label}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => !isComplete && onNavigate(step.route, step.state)}
        disabled={isComplete}
        className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          isComplete
            ? 'bg-success/10 text-success cursor-default'
            : 'bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20'
        }`}
      >
        {isComplete ? 'Done ✓' : isInProgress ? 'Continue →' : 'Start →'}
      </button>
    </div>
  );
}
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { ONBOARDING_PHASES, getOnboardingPhase } from '@/lib/onboarding';

const TILE_COLORS = [
  'bg-orange-50 text-orange-600',
  'bg-blue-50 text-blue-600',
  'bg-violet-50 text-violet-600',
  'bg-blue-50 text-blue-600',
  'bg-emerald-50 text-emerald-600',
  'bg-amber-50 text-amber-600',
];

export default function OnboardingTiles({ user, bikes, kycDocs, groupMembers, wallet }) {
  const phase = getOnboardingPhase(user, bikes, groupMembers, wallet);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-heading font-bold text-foreground">Complete Your Setup</h2>
        {phase >= 4 && <span className="text-xs font-medium text-success">All done!</span>}
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {ONBOARDING_PHASES.map((p, i) => {
          const Icon = p.icon;
          const done = i < phase;
          const pending = i === phase;
          return (
            <Link
              key={p.id}
              to="/app/profile"
              state={done ? { viewStep: i } : undefined}
              className="flex-shrink-0 w-28 bg-card border border-border rounded-xl p-3 hover:bg-accent transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${TILE_COLORS[i]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {done ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : pending ? (
                    <Clock className="w-4 h-4 text-warning" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
              </div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Step {i + 1}</p>
              <p className="text-xs font-semibold">{p.short}</p>
              <p className={`text-[10px] ${done ? 'text-success' : pending ? 'text-warning' : 'text-muted-foreground'}`}>
                {done ? 'Complete' : pending ? 'In progress' : 'Not Started'}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
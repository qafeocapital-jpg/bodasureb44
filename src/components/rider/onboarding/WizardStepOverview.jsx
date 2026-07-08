import { X } from 'lucide-react';
import { User, Bike, MapPin, Users } from 'lucide-react';
import WizardStepCard from './WizardStepCard';

const STEPS = [
  { name: 'Activate Wallet & Profile', icon: User, color: 'bg-orange-50 text-orange-600', route: '/app/profile', state: { targetPhase: 0 } },
  { name: 'Register Your Bike', icon: Bike, color: 'bg-blue-50 text-blue-600', route: '/app/bikes/register', state: null },
  { name: 'Map to County & Stage', icon: MapPin, color: 'bg-violet-50 text-violet-600', route: '/app/profile', state: { targetPhase: 2 } },
  { name: 'Join Your SACCO', icon: Users, color: 'bg-blue-50 text-blue-600', route: '/app/groups/register-sacco', state: null },
];

export default function WizardStepOverview({ phase, onNavigate, onClose }) {
  const completedCount = phase;
  const fillPct = (phase / 4) * 100;

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors"
      >
        <X className="w-4 h-4 text-foreground" />
      </button>

      <div className="px-5 py-6">
        <h2 className="font-heading font-extrabold text-xl text-foreground mb-1">Complete Your Setup</h2>
        <p className="text-sm text-muted-foreground mb-4">{completedCount} of 4 steps complete</p>

        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-6">
          <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${fillPct}%` }} />
        </div>

        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const status = i < phase ? 'complete' : i === phase ? 'in_progress' : 'not_started';
            return <WizardStepCard key={i} step={step} index={i} status={status} onNavigate={onNavigate} />;
          })}
        </div>
      </div>
    </div>
  );
}
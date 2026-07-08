import { Zap } from 'lucide-react';

export default function OnboardingFAB({ phase, userId, onOpen }) {
  const remaining = 4 - phase;
  return (
    <button onClick={onOpen} className="fixed right-4 z-40 animate-pulse-glow" style={{ bottom: 'calc(70px + env(safe-area-inset-bottom, 0px))' }}>
      <div className="bg-primary text-primary-foreground rounded-full px-4 py-2.5 shadow-lg shadow-primary/30 flex items-center gap-2 text-sm font-semibold">
        <Zap className="w-4 h-4" /> {remaining} {remaining === 1 ? 'step' : 'steps'} left · Complete Setup
      </div>
    </button>
  );
}
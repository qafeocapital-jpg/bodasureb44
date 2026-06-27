import { useState, useEffect } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';

export default function OnboardingFAB({ phase, userId, onOpen }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (phase >= 5) {
      const key = `bodasure_wizard_complete_${userId}`;
      const ts = localStorage.getItem(key);
      if (!ts) {
        localStorage.setItem(key, Date.now().toString());
        return;
      }
      const days = (Date.now() - parseInt(ts)) / (1000 * 60 * 60 * 24);
      if (days >= 7) setHidden(true);
    }
  }, [phase, userId]);

  if (hidden) return null;

  if (phase >= 5) {
    return (
      <div className="fixed bottom-[70px] right-4 z-40">
        <div className="bg-success text-success-foreground rounded-full px-4 py-2.5 shadow-lg flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" /> Fully Verified
        </div>
      </div>
    );
  }

  const remaining = 5 - phase;
  return (
    <button onClick={onOpen} className="fixed bottom-[70px] right-4 z-40 animate-pulse-glow">
      <div className="bg-primary text-primary-foreground rounded-full px-4 py-2.5 shadow-lg shadow-primary/30 flex items-center gap-2 text-sm font-semibold">
        <Zap className="w-4 h-4" /> {remaining} {remaining === 1 ? 'step' : 'steps'} left · Complete Setup
      </div>
    </button>
  );
}
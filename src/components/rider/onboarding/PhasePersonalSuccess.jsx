// Step 3: Wallet activation success screen
import { ChevronRight, Check } from 'lucide-react';

export default function PhasePersonalSuccess({ onComplete }) {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
        <Check className="w-10 h-10 text-success" />
      </div>
      <h2 className="font-heading font-bold text-xl">Wallet Activated!</h2>
      <p className="text-sm text-muted-foreground">Your BodaSure Wallet is now ready. Let's set up your bike registration.</p>
      <button
        onClick={onComplete}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm"
      >
        Continue to Bike Registration <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
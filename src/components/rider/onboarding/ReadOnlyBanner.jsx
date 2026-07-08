import { Lock, ChevronLeft } from 'lucide-react';

export function ReadOnlyBanner() {
  return (
    <div className="bg-muted border border-border rounded-xl p-3 flex items-center gap-2">
      <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <p className="text-xs text-muted-foreground">This step is complete. You cannot make any more changes.</p>
    </div>
  );
}

export function ReadOnlyBackButton({ onExit }) {
  return (
    <button
      onClick={onExit}
      className="bg-muted text-foreground rounded-xl py-2.5 px-4 text-sm font-semibold flex items-center gap-1.5 w-full justify-center"
    >
      <ChevronLeft className="w-4 h-4" /> Back to Setup
    </button>
  );
}

export default ReadOnlyBanner;
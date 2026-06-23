import { X, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TierLimitGateSheet({ open, onClose, limitInfo }) {
  const navigate = useNavigate();
  if (!open || !limitInfo) return null;

  const used = limitInfo.daily_used_kes || 0;
  const limit = limitInfo.daily_limit_kes || 5000;
  const pct = Math.min(100, (used / limit) * 100);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[512px] bg-card rounded-t-3xl p-6 pb-8 animate-slide-up z-[61]">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <h3 className="font-heading font-bold text-lg mb-1">Daily Limit Reached</h3>
        <p className="text-sm text-muted-foreground mb-4">
          You've hit your Tier 1 daily limit. Verify your ID in 2 minutes to unlock unlimited earning.
        </p>

        <div className="bg-muted rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Today's Usage</span>
            <span className="text-xs font-bold">KES {used.toLocaleString()} / {limit.toLocaleString()}</span>
          </div>
          <div className="w-full h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Tier 1</p>
            <p className="text-sm font-bold">KES 5,000/day</p>
          </div>
          <div className="bg-success/10 rounded-xl p-3 text-center ring-1 ring-success/20">
            <p className="text-[10px] font-semibold text-success uppercase">Tier 2</p>
            <p className="text-sm font-bold text-success">Unlimited</p>
          </div>
        </div>

        <button
          onClick={() => { onClose(); navigate('/app/compliance'); }}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm"
        >
          Verify ID — Unlock Unlimited <ArrowRight className="w-4 h-4" />
        </button>
        <button onClick={onClose} className="w-full mt-2 text-center text-sm text-muted-foreground py-2">
          Not now
        </button>
      </div>
    </>
  );
}
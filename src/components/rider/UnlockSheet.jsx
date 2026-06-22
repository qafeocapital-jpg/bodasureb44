import { X, Lock } from 'lucide-react';

export default function UnlockSheet({ open, onClose, title, message, actionLabel, actionLink, onAction }) {
  if (!open) return null;

  const handleAction = () => {
    if (onAction) onAction();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[512px] bg-card rounded-t-3xl p-6 pb-24 animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-warning" />
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <h3 className="font-heading font-bold text-lg mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-5">{message}</p>
        {actionLink ? (
          <a
            href={actionLink}
            className="block w-full text-center bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            {actionLabel}
          </a>
        ) : (
          <button
            onClick={handleAction}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            {actionLabel}
          </button>
        )}
        <button onClick={onClose} className="w-full mt-2 text-center text-sm text-muted-foreground py-2">
          Not now
        </button>
      </div>
    </div>
  );
}
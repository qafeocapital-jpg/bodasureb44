import { useNavigate } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';

export default function LockedTileSheet({ open, onClose, tileLabel, featureDescription }) {
  const navigate = useNavigate();

  const handleVerify = () => {
    onClose();
    navigate('/app/profile', { state: { jumpToPhase: 5 } });
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-lg z-50 animate-slide-up">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 bg-muted rounded-full" />
        </div>

        {/* Content */}
        <div className="px-5 pb-6">
          {/* Close button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={onClose}
              className="p-2 -mr-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="bg-orange-50 rounded-full p-4">
              <ShieldCheck className="w-8 h-8 text-orange-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-lg font-heading font-bold text-center mb-2">
            {tileLabel}
          </h2>

          {/* Message */}
          <p className="text-sm text-muted-foreground text-center mb-4">
            This feature requires Tier 2 verification
          </p>

          {/* Description */}
          <p className="text-sm text-foreground text-center mb-6">
            {featureDescription}
          </p>

          {/* CTA Button */}
          <button
            onClick={handleVerify}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors"
          >
            Complete Verification <span className="text-lg">→</span>
          </button>
        </div>
      </div>
    </>
  );
}
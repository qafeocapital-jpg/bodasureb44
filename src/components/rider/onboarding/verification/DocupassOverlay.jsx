import { X, ShieldCheck } from 'lucide-react';

/**
 * Full-screen iframe overlay for DocuPass hosted verification (desktop).
 * On mobile, DocuPass opens in a new browser tab instead.
 */
export default function DocupassOverlay({ url, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 bg-background">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Secure Identity Verification</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="Close verification"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <iframe
        src={url}
        className="flex-1 w-full border-0"
        allow="camera; microphone; fullscreen"
        title="IDAnalyzer DocuPass Verification"
      />
    </div>
  );
}
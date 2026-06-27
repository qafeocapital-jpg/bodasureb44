import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';

const PDF_URL = '/assets/BodaSure-County-Brief.pdf';

export default function CountyBriefModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center sm:m-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 sm:mx-4 flex flex-col sm:h-[80vh] h-full sm:rounded-2xl rounded-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="bg-foreground text-background px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="font-heading font-bold text-sm sm:text-base truncate pr-4">
            BodaSure County Government Brief · 2026
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={PDF_URL}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-background/30 rounded-lg text-xs font-semibold hover:bg-background/10 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-background/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF iframe */}
        <iframe
          src={`${PDF_URL}#toolbar=1`}
          title="BodaSure County Government Brief"
          className="w-full flex-1 border-0"
        />
      </div>
    </div>,
    document.body
  );
}
import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Full-height sheet/drawer for PDF preview using an iframe embed.
 * No third-party PDF library needed — the file is served from BodaSure storage.
 *
 * @param {string} url - The PDF file URL to preview
 * @param {function} onClose - Callback to close the sheet
 */
export default function PdfPreviewSheet({ url, onClose }) {
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-t-3xl sm:rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-heading font-bold">DocuPass Audit Report</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* PDF iframe */}
        <div className="flex-1 min-h-0">
          <iframe
            src={url}
            title="DocuPass Audit Report"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
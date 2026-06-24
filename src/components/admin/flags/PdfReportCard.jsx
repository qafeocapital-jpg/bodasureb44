import { useState } from 'react';
import { FileText, Download, Loader2, ExternalLink } from 'lucide-react';
import PdfPreviewSheet from '@/components/admin/flags/PdfPreviewSheet';

/**
 * PDF Audit Report card.
 * Shows the stored DocuPass audit report PDF with a thumbnail preview
 * and buttons to open the full preview or download.
 *
 * @param {object} user - User entity with docupass_report_url and docupass_report_fetched
 */
export default function PdfReportCard({ user }) {
  const [showPreview, setShowPreview] = useState(false);

  const reportUrl = user?.docupass_report_url;
  const reportFetched = user?.docupass_report_fetched;

  return (
    <>
      <div className="space-y-2 pt-2 border-t border-border">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
          <FileText className="w-3 h-3" /> Audit Report
        </p>

        {reportUrl ? (
          <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
            {/* Thumbnail preview placeholder */}
            <div
              className="w-16 h-20 rounded-md border border-border bg-card flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowPreview(true)}
            >
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">DocuPass Audit Report</p>
              <p className="text-[10px] text-muted-foreground">PDF · Stored permanently</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowPreview(true)}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Open Full Preview
                </button>
                <a
                  href={reportUrl}
                  download={`docupass_audit_${user?.id || 'report'}.pdf`}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:underline"
                >
                  <Download className="w-3 h-3" /> Download
                </a>
              </div>
            </div>
          </div>
        ) : reportFetched === false ? (
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Fetching audit report from IDAnalyzer...</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">Audit report not available</p>
          </div>
        )}
      </div>

      {showPreview && reportUrl && (
        <PdfPreviewSheet url={reportUrl} onClose={() => setShowPreview(false)} />
      )}
    </>
  );
}
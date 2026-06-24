import { FileText, ExternalLink, Loader2 } from 'lucide-react';

/**
 * PDF Audit Report card.
 * Shows the IDAnalyzer-hosted audit report URL with a "View PDF" button
 * that opens it in a new browser tab (the browser's native PDF viewer).
 *
 * No PDF is downloaded or stored on BodaSure servers — the IDAnalyzer URL
 * is stored directly on the User entity, optimizing DB storage for millions of users.
 *
 * @param {object} user - User entity with docupass_report_url and docupass_report_fetched
 */
export default function PdfReportCard({ user }) {
  const reportUrl = user?.docupass_report_url;
  const reportFetched = user?.docupass_report_fetched;

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <FileText className="w-3 h-3" /> Audit Report
      </p>

      {reportUrl ? (
        <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
          <div className="w-12 h-14 rounded-md border border-border bg-card flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">DocuPass Audit Report</p>
            <p className="text-[10px] text-muted-foreground">PDF · Hosted by IDAnalyzer</p>
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> View PDF
            </a>
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
  );
}
import { useState } from 'react';
import { formatDateTime } from '@/lib/format';
import { CheckCircle2, Bike, Loader2 } from 'lucide-react';
import BikePhotoReviewPanel from '@/components/admin/BikePhotoReviewPanel';

function parseAnprSignal(providerRef, docType) {
  if (docType === 'bike_left') return { label: 'N/A', className: 'bg-muted text-muted-foreground' };
  if (!providerRef) return { label: 'No Plate Detected', className: 'bg-destructive/10 text-destructive' };
  try {
    const parsed = JSON.parse(providerRef);
    if (parsed.match) return { label: 'Plate Match', className: 'bg-success/10 text-success' };
    if (parsed.detectedPlate) return { label: 'Plate Mismatch', className: 'bg-warning/10 text-warning' };
    return { label: 'No Plate Detected', className: 'bg-destructive/10 text-destructive' };
  } catch {
    const parts = providerRef.split('|');
    if (parts.length >= 2 && parts[0]) return { label: 'Plate Mismatch', className: 'bg-warning/10 text-warning' };
    return { label: 'No Plate Detected', className: 'bg-destructive/10 text-destructive' };
  }
}

const DOC_TYPE_LABELS = {
  bike_left: 'Side View',
  bike_rear: 'Rear + Plate',
};

export default function BikePhotoQueue({ docs, loading, onRefresh }) {
  const [selectedDoc, setSelectedDoc] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <CheckCircle2 className="w-10 h-10 mx-auto text-success mb-2" />
        <p className="text-sm font-medium text-foreground">Queue clear — all bike photos reviewed</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground mb-3">{docs.length} pending review</p>

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {docs.map(doc => {
          const signal = parseAnprSignal(doc.provider_reference, doc.document_type);
          return (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-orange-400 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium text-sm">{doc.rider?.full_name || 'Unknown Rider'}</p>
                  <p className="text-xs text-muted-foreground">{doc.rider?.phone || '—'}</p>
                </div>
                <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${signal.className}`}>
                  {signal.label}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Bike className="w-3 h-3" />
                  {doc.vehicle?.plate_number || 'No plate'}
                </span>
                <span>{DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</span>
                <span>{formatDateTime(doc.created_date)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rider</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plate</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">ANPR Signal</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Uploaded</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {docs.map(doc => {
              const signal = parseAnprSignal(doc.provider_reference, doc.document_type);
              return (
                <tr key={doc.id} className="border-t border-border hover:bg-accent/50 cursor-pointer" onClick={() => setSelectedDoc(doc)}>
                  <td className="px-4 py-3 font-medium">{doc.rider?.full_name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{doc.rider?.phone || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{doc.vehicle?.plate_number || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${signal.className}`}>
                      {signal.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(doc.created_date)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-orange-600 font-semibold">Review</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedDoc && (
        <BikePhotoReviewPanel
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onAction={() => { setSelectedDoc(null); onRefresh(); }}
        />
      )}
    </>
  );
}
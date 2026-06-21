import { ClipboardCheck, MapPin, CheckCircle2, XCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/format';

export default function InspectionTab({ inspections, users = {} }) {
  if (inspections.length === 0) {
    return (
      <div className="bg-muted/50 rounded-xl p-8 text-center">
        <ClipboardCheck className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No inspections recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {inspections.map(insp => {
        const isCompliant = insp.result === 'compliant';
        const inspector = users[insp.inspector_id];
        return (
          <div key={insp.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <span className={`flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${isCompliant ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'}`}>
                {isCompliant ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {isCompliant ? 'Compliant' : 'Non-Compliant'}
              </span>
              <span className="text-xs text-muted-foreground">{formatDateTime(insp.inspected_at || insp.created_date)}</span>
            </div>
            {inspector && <p className="text-xs text-muted-foreground mb-1">Inspector: {inspector.full_name || 'Unknown'}</p>}
            {insp.notes && <p className="text-sm text-foreground mt-1">{insp.notes}</p>}
            {insp.location_lat && insp.location_lng && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {insp.location_lat.toFixed(4)}, {insp.location_lng.toFixed(4)}
              </p>
            )}
            {insp.photo_url && (
              <img src={insp.photo_url} alt="Inspection" className="w-full h-32 rounded-lg object-cover mt-2 border border-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}
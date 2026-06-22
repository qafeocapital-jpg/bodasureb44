import { CheckCircle2, Clock, XCircle, AlertCircle, Image as ImageIcon, FileText } from 'lucide-react';

const accentMap = {
  orange: { solidBtn: 'bg-primary text-primary-foreground' },
  emerald: { solidBtn: 'bg-emerald-600 text-white' },
  blue: { solidBtn: 'bg-blue-600 text-white' },
};

export default function BikeInfoTab({ vehicle, county, stage, isStaff, onApprove, onReject, accent = 'orange' }) {
  const a = accentMap[accent] || accentMap.orange;

  const statusConfig = {
    approved: { icon: CheckCircle2, cls: 'text-success bg-success/10', label: 'Approved' },
    pending: { icon: Clock, cls: 'text-warning bg-warning/10', label: 'Pending' },
    rejected: { icon: XCircle, cls: 'text-destructive bg-destructive/10', label: 'Rejected' },
  };
  const sc = statusConfig[vehicle.status] || statusConfig.pending;
  const StatusIcon = sc.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 ${sc.cls}`}>
          <StatusIcon className="w-3.5 h-3.5" /> {sc.label}
        </span>
        {vehicle.is_owner_rider && (
          <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-3 py-1">Owner-Rider</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {vehicle.bike_photo_url ? (
          <img src={vehicle.bike_photo_url} alt="Bike" className="w-full h-32 rounded-xl object-cover border border-border" />
        ) : (
          <div className="w-full h-32 rounded-xl bg-muted flex items-center justify-center border border-border">
            <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
          </div>
        )}
        {vehicle.logbook_url ? (
          <img src={vehicle.logbook_url} alt="Logbook" className="w-full h-32 rounded-xl object-cover border border-border" />
        ) : (
          <div className="w-full h-32 rounded-xl bg-muted flex items-center justify-center border border-border">
            <FileText className="w-8 h-8 text-muted-foreground/40" />
          </div>
        )}
      </div>

      <div className="space-y-0">
        {[
          ['Plate Number', vehicle.plate_number],
          ['Make', vehicle.make],
          ['Model', vehicle.model],
          ['Color', vehicle.color],
          ['County', county?.name],
          ['Stage', stage?.name],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between py-2 border-b border-border">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-medium">{value || '—'}</span>
          </div>
        ))}
      </div>

      {vehicle.status === 'rejected' && vehicle.rejection_reason && (
        <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/20 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-destructive">Rejection Reason</p>
            <p className="text-xs text-muted-foreground mt-0.5">{vehicle.rejection_reason}</p>
          </div>
        </div>
      )}

      {isStaff && vehicle.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <button onClick={onApprove} className={`flex-1 ${a.solidBtn} rounded-xl py-2.5 text-sm font-semibold`}>Approve</button>
          <button onClick={onReject} className="flex-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl py-2.5 text-sm font-semibold">Reject</button>
        </div>
      )}
    </div>
  );
}
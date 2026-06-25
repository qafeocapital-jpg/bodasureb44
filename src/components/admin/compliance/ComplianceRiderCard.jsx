// Individual rider row in KYC compliance dashboard
import { formatDateTime } from '@/lib/format';
import { CheckCircle2, Clock, AlertCircle, ChevronRight, ShieldCheck, Fingerprint } from 'lucide-react';

export function getStatusIcon(status) {
  switch (status) {
    case 'verified': return <CheckCircle2 className="w-4 h-4 text-success" />;
    case 'pending': return <Clock className="w-4 h-4 text-warning" />;
    case 'rejected': return <AlertCircle className="w-4 h-4 text-destructive" />;
    default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  }
}

export function getStatusLabel(status) {
  const labels = {
    unverified: 'Unverified',
    pending: 'Pending Review',
    verified: 'Verified',
    rejected: 'Rejected',
  };
  return labels[status] || 'Unknown';
}

export default function ComplianceRiderCard({ rider, onSelect }) {
  return (
    <div
      onClick={() => onSelect(rider.user_id)}
      className="bg-card border border-border rounded-xl p-4 hover:border-primary hover:bg-accent/50 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-sm truncate">
              {rider.user?.id_extracted_name || rider.user?.full_name || 'Unknown Rider'}
            </h3>
            <span className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-xs font-semibold text-muted-foreground">
              {getStatusIcon(rider.kycStatus)}
              {getStatusLabel(rider.kycStatus)}
            </span>
            {rider.docupassDecision && (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                rider.docupassDecision === 'accept' ? 'bg-success/10 text-success'
                : rider.docupassDecision === 'reject' ? 'bg-destructive/10 text-destructive'
                : 'bg-warning/10 text-warning'
              }`}>
                <ShieldCheck className="w-3 h-3" />
                IDAnalyzer: {rider.docupassDecision}
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground mb-2">
            <span>{rider.user?.phone || rider.user?.email || '—'}</span>
            {rider.user?.national_id && (
              <>
                <span className="hidden sm:inline">•</span>
                <span className="font-mono font-semibold text-foreground">ID: {rider.user.national_id}</span>
              </>
            )}
            {rider.vehicle?.plate_number && (
              <>
                <span className="hidden sm:inline">•</span>
                <span className="font-mono font-semibold text-foreground">{rider.vehicle.plate_number}</span>
              </>
            )}
          </div>
          {/* Extracted data summary for verified users */}
          {rider.user?.id_extracted_name && (
            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mb-1">
              {rider.user?.id_sex && <span>Gender: {rider.user.id_sex}</span>}
              {rider.user?.id_extracted_dob && <span>DOB: {rider.user.id_extracted_dob}</span>}
              {rider.user?.id_address && <span className="truncate max-w-[200px]">Address: {rider.user.id_address}</span>}
            </div>
          )}
          {/* Face match indicator */}
          {rider.user?.id_face_confidence != null && (
            <div className="flex items-center gap-1 text-[10px]">
              <Fingerprint className="w-3 h-3" />
              <span className={rider.user.id_face_confidence >= 0.7 ? 'text-success font-medium' : 'text-warning font-medium'}>
                Face Match: {Math.round(rider.user.id_face_confidence * 100)}%
              </span>
              {rider.user?.id_face_identical != null && (
                <span className={rider.user.id_face_identical ? 'text-success' : 'text-destructive'}>
                  ({rider.user.id_face_identical ? 'Identical' : 'Not Identical'})
                </span>
              )}
            </div>
          )}
          <div className="text-[10px] text-muted-foreground">
            Submitted: {formatDateTime(rider.oldestDocDate)}
            {rider.idAnalyzerDocs > 0 && (
              <span className="ml-2 text-success">• {rider.idAnalyzerDocs} IDAnalyzer docs</span>
            )}
            {rider.legacyDocs > 0 && (
              <span className="ml-2 text-amber-600">• {rider.legacyDocs} legacy docs</span>
            )}
          </div>
        </div>

        {/* Right: Docs and Action */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-orange-600">{rider.docCount}</p>
            <p className="text-xs text-muted-foreground">documents</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </div>
      </div>

      {/* Document Types */}
      {rider.docTypes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {rider.docTypes.slice(0, 4).map(type => (
            <span key={type} className="text-[10px] px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {type.replace(/_/g, ' ')}
            </span>
          ))}
          {rider.docTypes.length > 4 && (
            <span className="text-[10px] px-2 py-1 bg-muted text-muted-foreground rounded-full">
              +{rider.docTypes.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
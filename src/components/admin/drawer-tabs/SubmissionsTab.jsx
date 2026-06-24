import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDateTime } from '@/lib/format';
import { Loader2, ImageIcon, ShieldCheck, AlertTriangle, Car } from 'lucide-react';
import SignalBadge from '@/components/admin/flags/SignalBadge';
import ConfidenceBar from '@/components/admin/flags/ConfidenceBar';
import ImageLightbox from '@/components/admin/flags/ImageLightbox';

const DOC_TYPE_LABELS = {
  id_front: 'ID (Front)',
  id_back: 'ID (Back)',
  selfie: 'Selfie',
  bike_front: 'Bike (Front)',
  bike_left: 'Bike (Left)',
  bike_rear: 'Bike (Rear)',
  bike_right: 'Bike (Right)',
  logbook: 'Logbook',
  owner_id: 'Owner ID',
};

const IDENTITY_DOCS = ['id_front', 'id_back', 'selfie'];
const VEHICLE_DOCS = ['bike_front', 'bike_left', 'bike_rear', 'bike_right', 'logbook', 'owner_id'];
const STATUS_COLORS = { pending: 'amber', approved: 'green', rejected: 'red' };

function faceConfidenceColor(v) {
  if (v >= 0.70) return 'green';
  if (v >= 0.50) return 'amber';
  return 'red';
}

function faceConfidenceLabel(v) {
  if (v >= 0.85) return 'Strong Match';
  if (v >= 0.70) return 'Match';
  if (v >= 0.50) return 'Weak Match';
  return 'No Match';
}

function deriveDecision(idAnalyzerDocs) {
  if (idAnalyzerDocs.length === 0) return null;
  const statuses = idAnalyzerDocs.map(d => d.status);
  if (statuses.every(s => s === 'approved')) return 'accept';
  if (statuses.some(s => s === 'rejected')) return 'reject';
  return 'review';
}

const DECISION_CONFIG = {
  accept: { label: 'Accepted', color: 'green', icon: ShieldCheck },
  review: { label: 'Under Review', color: 'amber', icon: AlertTriangle },
  reject: { label: 'Rejected', color: 'red', icon: AlertTriangle },
};

export default function SubmissionsTab({ user }) {
  const [loading, setLoading] = useState(false);
  const [kycDocs, setKycDocs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    async function load() {
      setLoading(true);
      try {
        const [docs, vhcls] = await Promise.all([
          base44.entities.KycDocument.filter({ user_id: user.id }),
          base44.entities.Vehicle.filter({ rider_id: user.id }),
        ]);
        setKycDocs(docs);
        setVehicles(vhcls);
      } catch (e) {
        console.error('Failed to load submissions:', e);
      }
      setLoading(false);
    }
    load();
  }, [user?.id]);

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  // Section 1: Only IDAnalyzer docs for identity
  const idAnalyzerDocs = kycDocs.filter(d =>
    d.provider_name === 'idanalyzer_docupass' && IDENTITY_DOCS.includes(d.document_type)
  );
  const vehicleDocs = kycDocs.filter(d => VEHICLE_DOCS.includes(d.document_type));

  // Decision: from user field or derived from doc statuses
  const decision = user?.docupass_decision || deriveDecision(idAnalyzerDocs);
  const decisionConfig = decision ? DECISION_CONFIG[decision] : null;
  const faceConfidence = user?.id_face_confidence;

  // Rejection warnings
  const rejectionWarnings = idAnalyzerDocs
    .filter(d => d.rejection_reason)
    .map(d => ({ type: d.document_type, reason: d.rejection_reason }));

  return (
    <div className="space-y-5">
      {/* Section 1: IDAnalyzer Verification */}
      <div>
        <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          IDAnalyzer Verification
        </h4>

        {idAnalyzerDocs.length > 0 ? (
          <div className="border border-border rounded-xl p-4 space-y-4">
            {/* Decision Badge */}
            {decisionConfig && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Decision</span>
                <SignalBadge color={decisionConfig.color}>
                  <decisionConfig.icon className="w-3 h-3 mr-1 inline" />
                  {decisionConfig.label}
                </SignalBadge>
              </div>
            )}

            {/* Document Images */}
            <div className="grid grid-cols-3 gap-2">
              {IDENTITY_DOCS.map(docType => {
                const doc = idAnalyzerDocs.find(d => d.document_type === docType);
                return doc ? (
                  <button
                    key={doc.id}
                    onClick={() => doc.file_url && setLightbox(doc.file_url)}
                    className="flex flex-col rounded-lg border border-border overflow-hidden hover:opacity-90 transition-opacity text-left group"
                  >
                    <div className="w-full aspect-[4/3] bg-muted overflow-hidden">
                      {doc.file_url ? (
                        <img src={doc.file_url} alt={doc.document_type} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon className="w-5 h-5" /></div>
                      )}
                    </div>
                    <div className="p-1.5">
                      <p className="text-[9px] font-semibold">{DOC_TYPE_LABELS[doc.document_type]}</p>
                      <SignalBadge color={STATUS_COLORS[doc.status] || 'grey'}>{doc.status}</SignalBadge>
                    </div>
                  </button>
                ) : (
                  <div key={docType} className="flex flex-col rounded-lg border border-dashed border-border overflow-hidden">
                    <div className="w-full aspect-[4/3] bg-muted/50 flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="p-1.5">
                      <p className="text-[9px] font-semibold text-muted-foreground">{DOC_TYPE_LABELS[docType]}</p>
                      <p className="text-[9px] text-muted-foreground">—</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Extracted Fields */}
            {(user?.id_extracted_name || user?.id_extracted_dob || user?.national_id) && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Extracted Data</p>
                {user?.id_extracted_name && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Full Name</span>
                    <span className="font-medium font-mono">{user.id_extracted_name}</span>
                  </div>
                )}
                {user?.id_extracted_dob && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Date of Birth</span>
                    <span className="font-medium font-mono">{user.id_extracted_dob}</span>
                  </div>
                )}
                {user?.national_id && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">National ID</span>
                    <span className="font-medium font-mono">{user.national_id}</span>
                  </div>
                )}
              </div>
            )}

            {/* Face Match Confidence */}
            {faceConfidence != null && (
              <div className="space-y-1.5 pt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Face Match Confidence</p>
                  <span className="text-xs font-medium">{faceConfidenceLabel(faceConfidence)}</span>
                </div>
                <ConfidenceBar value={faceConfidence} color={faceConfidenceColor(faceConfidence)} />
              </div>
            )}

            {/* Rejection Warnings */}
            {rejectionWarnings.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Warnings</p>
                <div className="flex flex-wrap gap-1">
                  {rejectionWarnings.map((w, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[10px] text-destructive bg-destructive/10 rounded px-2 py-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {DOC_TYPE_LABELS[w.type]}: {w.reason}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Provider Reference */}
            {idAnalyzerDocs[0]?.provider_reference && (
              <div className="flex justify-between text-[10px] pt-2 border-t border-border">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-mono text-muted-foreground">{idAnalyzerDocs[0].provider_reference}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground bg-muted rounded-lg p-4 text-center">
            No IDAnalyzer verification submitted yet
          </p>
        )}
      </div>

      {/* Section 2: Vehicle Submissions */}
      <div>
        <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
          <Car className="w-3.5 h-3.5 text-primary" />
          Vehicle Submissions
        </h4>
        {vehicles.length > 0 ? (
          <div className="space-y-3">
            {vehicles.map(vehicle => (
              <div key={vehicle.id} className="border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold font-mono">{vehicle.plate_number}</span>
                  <SignalBadge color={STATUS_COLORS[vehicle.status] || 'grey'}>{vehicle.status}</SignalBadge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {VEHICLE_DOCS.map(docType => {
                    const doc = vehicleDocs.find(d => d.document_type === docType && d.user_id === user.id);
                    return doc ? (
                      <DocCard key={doc.id} doc={doc} onImageClick={() => doc.file_url && setLightbox(doc.file_url)} />
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground bg-muted rounded-lg p-4 text-center">No vehicles registered</p>
        )}
      </div>

      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function DocCard({ doc, onImageClick }) {
  return (
    <button
      onClick={onImageClick}
      className="flex flex-col rounded-lg border border-border overflow-hidden hover:opacity-90 transition-opacity text-left group"
    >
      <div className="w-full aspect-[4/3] bg-muted overflow-hidden">
        {doc.file_url ? (
          <img src={doc.file_url} alt={doc.document_type} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon className="w-6 h-6" /></div>
        )}
      </div>
      <div className="p-2.5 space-y-1">
        <p className="text-[10px] font-semibold text-foreground">{DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</p>
        <p className="text-[9px] text-muted-foreground">{formatDateTime(doc.created_date)}</p>
        <SignalBadge color={STATUS_COLORS[doc.status] || 'grey'}>{doc.status}</SignalBadge>
        {doc.rejection_reason && (
          <p className="text-[9px] text-destructive bg-destructive/10 rounded px-1.5 py-0.5">{doc.rejection_reason}</p>
        )}
      </div>
    </button>
  );
}
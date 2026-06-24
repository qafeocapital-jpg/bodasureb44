import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDateTime } from '@/lib/format';
import { Loader2, ImageIcon, ShieldCheck, AlertTriangle, Car, ChevronDown, ChevronUp, Fingerprint, MapPin, Calendar, FileText, User, Globe, Activity, ScanLine } from 'lucide-react';
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

function DataRow({ icon: Icon, label, value, mono }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between items-center text-xs py-0.5">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </span>
      <span className={`font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

export default function SubmissionsTab({ user }) {
  const [loading, setLoading] = useState(false);
  const [kycDocs, setKycDocs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [showRawData, setShowRawData] = useState(false);

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

  const idAnalyzerDocs = kycDocs.filter(d =>
    d.provider_name === 'idanalyzer_docupass' && IDENTITY_DOCS.includes(d.document_type)
  );
  const legacyIdentityDocs = kycDocs.filter(d =>
    !d.provider_name && IDENTITY_DOCS.includes(d.document_type)
  );
  const vehicleDocs = kycDocs.filter(d => VEHICLE_DOCS.includes(d.document_type));

  const decision = user?.docupass_decision || deriveDecision(idAnalyzerDocs);
  const decisionConfig = decision ? DECISION_CONFIG[decision] : null;
  const faceConfidence = user?.id_face_confidence;
  const faceIdentical = user?.id_face_identical;
  const authScore = user?.id_authentication_score;
  const matchRate = user?.id_match_rate;

  let extractedData = null;
  try {
    extractedData = user?.id_extracted_data ? JSON.parse(user.id_extracted_data) : null;
  } catch {}

  const rejectionWarnings = idAnalyzerDocs
    .filter(d => d.rejection_reason)
    .map(d => ({ type: d.document_type, reason: d.rejection_reason }));

  const hasLegacyOnly = idAnalyzerDocs.length === 0 && legacyIdentityDocs.length > 0;

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

            {/* Verification timestamp */}
            {user?.docupass_verified_at && (
              <DataRow icon={Calendar} label="Verified At" value={formatDateTime(user.docupass_verified_at)} />
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

            {/* Extracted Identity Data */}
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <FileText className="w-3 h-3" /> Extracted Identity Data
              </p>
              <DataRow icon={User} label="Full Name" value={user?.id_extracted_name || extractedData?.fullName} mono />
              <DataRow icon={Calendar} label="Date of Birth" value={user?.id_extracted_dob || extractedData?.dob} />
              <DataRow icon={User} label="Gender" value={user?.id_sex || extractedData?.sex} />
              <DataRow icon={Calendar} label="Age" value={extractedData?.age} />
              <DataRow icon={FileText} label="National ID" value={user?.national_id || extractedData?.documentNumber} mono />
              <DataRow icon={FileText} label="Document Type" value={extractedData?.documentType} />
              <DataRow icon={Calendar} label="ID Issue Date" value={user?.id_issued_date} />
              <DataRow icon={Calendar} label="ID Expiry Date" value={user?.id_expiry_date} />
              <DataRow icon={MapPin} label="Address" value={user?.id_address || [extractedData?.address1, extractedData?.address2, extractedData?.postcode].filter(Boolean).join(', ')} />
              <DataRow icon={Globe} label="Country" value={user?.id_country || extractedData?.country} />
              <DataRow icon={Globe} label="Nationality" value={user?.id_nationality || extractedData?.nationality} />
              <DataRow icon={FileText} label="Issuing Authority" value={extractedData?.issuingAuthority} />
              <DataRow icon={FileText} label="Internal ID" value={extractedData?.internalId} mono />
            </div>

            {/* Biometric Verification */}
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Fingerprint className="w-3 h-3" /> Biometric Verification
              </p>
              {faceConfidence != null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Face Match Confidence</span>
                    <span className="text-xs font-medium">{faceConfidenceLabel(faceConfidence)}</span>
                  </div>
                  <ConfidenceBar value={faceConfidence} color={faceConfidenceColor(faceConfidence)} />
                </div>
              )}
              {faceIdentical != null && (
                <DataRow icon={Fingerprint} label="Face Identical" value={faceIdentical ? 'Yes' : 'No'} />
              )}
            </div>

            {/* Document Authentication */}
            {authScore != null && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <ScanLine className="w-3 h-3" /> Document Authentication
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Authenticity Score</span>
                    <span className="text-xs font-medium">{authScore >= 0.5 ? 'Authentic' : 'Suspicious'}</span>
                  </div>
                  <ConfidenceBar value={authScore} color={authScore >= 0.5 ? 'green' : 'red'} />
                </div>
              </div>
            )}

            {/* OCR Quality */}
            {matchRate != null && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Activity className="w-3 h-3" /> OCR Quality
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Data Extraction Rate</span>
                    <span className="text-xs font-medium">{matchRate >= 0.7 ? 'Good' : matchRate >= 0.4 ? 'Fair' : 'Poor'}</span>
                  </div>
                  <ConfidenceBar value={matchRate} color={matchRate >= 0.7 ? 'green' : matchRate >= 0.4 ? 'amber' : 'red'} />
                </div>
              </div>
            )}

            {/* AML Flags */}
            {extractedData?.aml && extractedData.aml.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> AML / Sanctions Flags ({extractedData.aml.length})
                </p>
                {extractedData.aml.slice(0, 3).map((aml, i) => (
                  <div key={i} className="text-[10px] text-destructive bg-destructive/10 rounded px-2 py-1">
                    {aml.fullname?.[0] || 'Unknown'} — {aml.note?.[0] || aml.program?.[0] || 'Flagged'}
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
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

            {/* Raw Data Toggle */}
            {extractedData && (
              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => setShowRawData(!showRawData)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                >
                  {showRawData ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showRawData ? 'Hide' : 'Show'} Raw Extraction Data
                </button>
                {showRawData && (
                  <pre className="mt-2 text-[9px] bg-muted rounded-lg p-2 overflow-x-auto max-h-48 font-mono">
                    {JSON.stringify(extractedData, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        ) : hasLegacyOnly ? (
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700">Legacy Documents Detected</p>
                <p className="text-[10px] text-amber-600 mt-1">
                  {legacyIdentityDocs.length} identity document(s) were uploaded through the old manual flow (pre-IDAnalyzer).
                  These lack biometric verification, OCR extraction, and document authentication.
                </p>
                <p className="text-[10px] text-amber-600 mt-1">
                  The rider must complete DocuPass verification to get full identity extraction and auto-approval.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {legacyIdentityDocs.map(doc => (
                <span key={doc.id} className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                  {DOC_TYPE_LABELS[doc.document_type]}: {doc.status}
                </span>
              ))}
            </div>
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
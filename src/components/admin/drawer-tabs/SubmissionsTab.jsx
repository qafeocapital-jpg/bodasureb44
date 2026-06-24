import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDateTime } from '@/lib/format';
import { FileText, Loader2, ImageIcon } from 'lucide-react';
import SignalBadge from '@/components/admin/flags/SignalBadge';
import ConfidenceBar from '@/components/admin/flags/ConfidenceBar';
import ImageLightbox from '@/components/admin/flags/ImageLightbox';

const DOC_TYPE_LABELS = {
  id_front: 'ID (Front)',
  id_back: 'ID (Back)',
  selfie: 'Selfie',
  logbook: 'Logbook',
  owner_id: 'Owner ID',
  bike_front: 'Bike (Front)',
  bike_left: 'Bike (Left)',
  bike_rear: 'Bike (Rear)',
  bike_right: 'Bike (Right)',
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

  const identityDocs = kycDocs.filter(d => IDENTITY_DOCS.includes(d.document_type));
  const vehicleDocs = kycDocs.filter(d => VEHICLE_DOCS.includes(d.document_type));
  const idAnalyzerDoc = kycDocs.find(d => d.provider_name === 'idanalyzer_v2');

  return (
    <div className="space-y-5">
      {/* Identity Documents */}
      <div>
        <h4 className="text-xs font-semibold mb-3">Identity Documents</h4>
        {identityDocs.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {identityDocs.map(doc => (
              <DocCard key={doc.id} doc={doc} onImageClick={() => doc.file_url && setLightbox(doc.file_url)} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground bg-muted rounded-lg p-4 text-center">No identity documents uploaded</p>
        )}
      </div>

      {/* Vehicle Submissions */}
      <div>
        <h4 className="text-xs font-semibold mb-3">Vehicle Submissions</h4>
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

      {/* Provider Signals */}
      {idAnalyzerDoc && (
        <div className="border border-border rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-semibold">ID Analyzer Signals</h4>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-muted-foreground">Document Status:</span>
              <SignalBadge color={STATUS_COLORS[idAnalyzerDoc.status] || 'grey'} className="ml-2">{idAnalyzerDoc.status}</SignalBadge>
            </div>
            {user.id_extracted_name && (
              <div>
                <span className="text-muted-foreground">Extracted Name:</span>
                <span className="ml-2 font-mono">{user.id_extracted_name}</span>
              </div>
            )}
            {user.id_extracted_dob && (
              <div>
                <span className="text-muted-foreground">Extracted DOB:</span>
                <span className="ml-2 font-mono">{user.id_extracted_dob}</span>
              </div>
            )}
          </div>
        </div>
      )}

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
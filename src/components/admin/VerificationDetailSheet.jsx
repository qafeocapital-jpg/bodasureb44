import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Check, XCircle, Loader2, Phone, CreditCard, Bike, UserCircle, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import PdfReportCard from '@/components/admin/flags/PdfReportCard';
import { formatPhoneDisplay } from '@/lib/phone';
import { getTaskStatuses, TASK_STATUS_CONFIG, VERIFICATION_TASKS } from '@/lib/verification';
import { useToast } from '@/components/ui/use-toast';

const DOC_LABELS = {
  id_front: 'ID Front',
  id_back: 'ID Back',
  selfie: 'Selfie',
  bike_front: 'Bike Front',
  bike_left: 'Bike Left',
  bike_rear: 'Bike Rear',
  bike_right: 'Bike Right',
};

const TASK_ICONS = [CreditCard, Bike, UserCircle, Phone, ShieldCheck];

export default function VerificationDetailSheet({ riderId, onClose, canApprove = false }) {
  const { toast } = useToast();
  const [rider, setRider] = useState(null);
  const [kycDocs, setKycDocs] = useState([]);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectingDoc, setRejectingDoc] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [replaying, setReplaying] = useState(false);

  useEffect(() => { load(); }, [riderId]);

  async function load() {
    if (!riderId) return;
    setLoading(true);
    try {
      const [users, docs, vehicles] = await Promise.all([
        base44.entities.User.filter({ id: riderId }),
        base44.entities.KycDocument.filter({ user_id: riderId }),
        base44.entities.Vehicle.filter({ rider_id: riderId }, '-created_date', 1),
      ]);
      setRider(users[0] || null);
      setKycDocs(docs);
      setVehicle(vehicles[0] || null);
    } catch (e) {}
    setLoading(false);
  }

  async function approveDoc(doc) {
    try {
      await base44.functions.invoke('processKycDecision', {
        docId: doc.id,
        userId: riderId,
        action: 'approve',
      });
      toast({ title: 'Document approved' });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  }

  async function confirmReject() {
    if (!rejectingDoc || rejectReason.trim().length < 10) return;
    setRejecting(true);
    try {
      await base44.functions.invoke('processKycDecision', {
        docId: rejectingDoc.id,
        userId: riderId,
        action: 'reject',
        reason: rejectReason.trim(),
      });
      toast({ title: 'Document rejected' });
      setRejectingDoc(null);
      setRejectReason('');
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setRejecting(false);
  }

  async function handleReplayWebhook() {
    if (!rider?.docupass_session_reference) {
      toast({ title: 'No session reference', description: 'This user has no DocuPass session reference stored.', variant: 'destructive' });
      return;
    }
    setReplaying(true);
    try {
      const res = await base44.functions.invoke('replayDocupassWebhook', {
        transactionId: rider.docupass_session_reference,
        userId: riderId,
      });
      if (res.data?.success) {
        toast({
          title: 'Webhook replayed',
          description: `Decision: ${res.data.decision}. ${res.data.note || ''}`,
        });
        load();
      } else {
        toast({ title: 'Replay failed', description: res.data?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Replay failed', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
    setReplaying(false);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <Loader2 className="w-6 h-6 animate-spin text-white relative z-10" />
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-card rounded-2xl p-6 max-w-md w-full text-center">
          <p className="text-sm text-muted-foreground">Rider not found</p>
          <button onClick={onClose} className="mt-3 text-sm font-semibold">Close</button>
        </div>
      </div>
    );
  }

  const tasks = getTaskStatuses(kycDocs, rider, vehicle);
  const docTypes = ['id_front', 'id_back', 'selfie', 'bike_front', 'bike_left', 'bike_rear', 'bike_right'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
          <div>
            <h3 className="font-heading font-bold text-lg">{rider.full_name || 'Unknown'}</h3>
            <p className="text-xs text-muted-foreground">{rider.phone ? formatPhoneDisplay(rider.phone) : rider.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Sub-task statuses */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Verification Tasks</p>
            <div className="grid grid-cols-1 gap-1.5">
              {VERIFICATION_TASKS.map((task, i) => {
                const status = tasks[i]?.status || 'not_started';
                const config = TASK_STATUS_CONFIG[status];
                const Icon = TASK_ICONS[i];
                return (
                  <div key={task.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                    <Icon className={`w-4 h-4 ${config.className}`} />
                    <span className="text-xs font-medium flex-1">{task.name}</span>
                    <span className={`text-[10px] font-semibold ${config.className}`}>{config.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* IDAnalyzer Extracted Data */}
          {rider.docupass_decision && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  IDAnalyzer Verification
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-muted-foreground">kyc_status:</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    rider.kyc_status === 'verified' ? 'bg-success/10 text-success'
                    : rider.kyc_status === 'pending_confirmation' ? 'bg-blue-50 text-blue-600'
                    : rider.kyc_status === 'rejected' ? 'bg-destructive/10 text-destructive'
                    : 'bg-warning/10 text-warning'
                  }`}>
                    {rider.kyc_status || 'unverified'}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    rider.docupass_decision === 'accept' ? 'bg-success/10 text-success'
                    : rider.docupass_decision === 'reject' ? 'bg-destructive/10 text-destructive'
                    : 'bg-warning/10 text-warning'
                  }`}>
                    {rider.docupass_decision}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {rider.id_extracted_name && (
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Full Name</p>
                    <p className="text-xs font-medium">{rider.id_extracted_name}</p>
                  </div>
                )}
                {rider.id_extracted_dob && (
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Date of Birth</p>
                    <p className="text-xs font-medium">{rider.id_extracted_dob}</p>
                  </div>
                )}
                {rider.national_id && (
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">National ID</p>
                    <p className="text-xs font-medium font-mono">{rider.national_id}</p>
                  </div>
                )}
                {rider.id_sex && (
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Gender</p>
                    <p className="text-xs font-medium">{rider.id_sex}</p>
                  </div>
                )}
                {rider.id_expiry_date && (
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">ID Expiry</p>
                    <p className="text-xs font-medium">{rider.id_expiry_date}</p>
                  </div>
                )}
                {rider.id_country && (
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Country</p>
                    <p className="text-xs font-medium">{rider.id_country}</p>
                  </div>
                )}
                {rider.id_address && (
                  <div className="col-span-2">
                    <p className="text-[9px] text-muted-foreground uppercase">Address</p>
                    <p className="text-xs font-medium">{rider.id_address}</p>
                  </div>
                )}
              </div>
              {rider.id_face_confidence != null && (
                <div className="flex items-center gap-2 pt-1 border-t border-primary/10">
                  <span className="text-[10px] text-muted-foreground">Face Match:</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${rider.id_face_confidence >= 0.7 ? 'bg-success' : 'bg-warning'}`}
                      style={{ width: `${Math.round(rider.id_face_confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold">
                    {Math.round(rider.id_face_confidence * 100)}%
                  </span>
                  {rider.id_face_identical != null && (
                    <span className={`text-[9px] ${rider.id_face_identical ? 'text-success' : 'text-destructive'}`}>
                      ({rider.id_face_identical ? 'Identical' : 'Not Identical'})
                    </span>
                  )}
                </div>
              )}

              {/* Mismatch reason (if any) */}
              {rider.kyc_mismatch_reason && (
                <div className="pt-1 border-t border-primary/10">
                  <p className="text-[9px] text-muted-foreground uppercase mb-0.5">Mismatch Reason</p>
                  <p className="text-[10px] text-destructive">{rider.kyc_mismatch_reason}</p>
                </div>
              )}

              {/* Session reference + Replay button */}
              {rider.docupass_session_reference && (
                <div className="pt-1 border-t border-primary/10 space-y-2">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase">Session Reference</p>
                    <p className="text-[10px] font-mono text-muted-foreground break-all">{rider.docupass_session_reference}</p>
                  </div>
                  <button
                    onClick={handleReplayWebhook}
                    disabled={replaying}
                    className="w-full flex items-center justify-center gap-1.5 bg-primary/10 text-primary rounded-lg py-2 text-[11px] font-semibold disabled:opacity-50"
                  >
                    {replaying
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Replaying…</>
                      : <><RefreshCw className="w-3.5 h-3.5" /> Replay Webhook</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PDF Audit Report — View PDF button opens IDAnalyzer-hosted URL */}
          <PdfReportCard user={rider} />

          {/* ID and Bike info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">National ID</p>
              <p className="text-sm font-semibold">{rider.national_id || '—'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Plate Number</p>
              <p className="text-sm font-semibold">{vehicle?.plate_number || '—'}</p>
            </div>
          </div>

          {/* Phone verified */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">Phone Verified</span>
            <span className={`ml-auto text-[10px] font-semibold ${rider.phone_verified ? 'text-success' : 'text-muted-foreground'}`}>
              {rider.phone_verified ? 'Yes' : 'No'}
            </span>
          </div>

          {/* Owner verification */}
          {vehicle && (
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium">Owner Verified</span>
              <span className={`ml-auto text-[10px] font-semibold ${vehicle.is_owner_rider || vehicle.owner_verified ? 'text-success' : 'text-amber-600'}`}>
                {vehicle.is_owner_rider ? 'Owner = Rider' : vehicle.owner_verified ? 'Yes' : 'Pending'}
              </span>
            </div>
          )}

          {/* Documents */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Uploaded Documents</p>
            <div className="grid grid-cols-2 gap-3">
              {docTypes.map(docType => {
                const doc = kycDocs.find(d => d.document_type === docType);
                return (
                  <div key={docType} className="border border-border rounded-lg overflow-hidden">
                    <div className="aspect-[4/3] bg-muted">
                      {doc?.file_url ? (
                        <img src={doc.file_url} alt={docType} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground">Not uploaded</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold">{DOC_LABELS[docType]}</span>
                        <span className={`text-[9px] font-semibold rounded-full px-1.5 py-0.5 ${
                          doc?.status === 'approved' ? 'bg-success/10 text-success'
                          : doc?.status === 'rejected' ? 'bg-destructive/10 text-destructive'
                          : doc?.status === 'pending' ? 'bg-blue-50 text-blue-600'
                          : 'bg-muted text-muted-foreground'
                        }`}>
                          {doc?.status || 'none'}
                        </span>
                      </div>
                      {doc?.rejection_reason && (
                        <p className="text-[9px] text-destructive mb-1">⚠ {doc.rejection_reason}</p>
                      )}
                      {canApprove && doc?.file_url && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => approveDoc(doc)}
                            disabled={doc.status === 'approved'}
                            className="flex-1 bg-success/10 text-success rounded-md py-1 text-[9px] font-semibold disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setRejectingDoc(doc); setRejectReason(''); }}
                            disabled={doc.status === 'rejected'}
                            className="flex-1 bg-destructive/10 text-destructive rounded-md py-1 text-[9px] font-semibold disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!canApprove && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <p className="text-[10px] text-blue-600">Document approval is available to Super Admins only.</p>
            </div>
          )}
        </div>

        {/* Reject modal */}
        {rejectingDoc && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => !rejecting && setRejectingDoc(null)} />
            <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
              <h3 className="font-heading font-bold text-lg mb-1">Reject Document</h3>
              <p className="text-xs text-muted-foreground mb-4">{DOC_LABELS[rejectingDoc.document_type]}</p>
              <label className="text-xs font-medium text-muted-foreground">Rejection Reason (min 10 characters)</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Explain why this document is being rejected..."
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-y"
                disabled={rejecting}
              />
              <p className="text-[10px] text-muted-foreground mt-1">{rejectReason.trim().length}/10</p>
              <div className="flex gap-2 pt-3">
                <button onClick={() => setRejectingDoc(null)} disabled={rejecting} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={confirmReject} disabled={rejecting || rejectReason.trim().length < 10} className="flex-1 bg-destructive text-destructive-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                  {rejecting ? 'Rejecting...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { X, Check, AlertTriangle, Loader2 } from 'lucide-react';

function parseAnprDetails(providerRef, docType) {
  if (docType === 'bike_left') return { match: null, detectedPlate: null, score: 0, label: 'N/A — side view photo' };
  if (!providerRef) return { match: false, detectedPlate: null, score: 0, label: 'No plate detected' };
  try {
    const parsed = JSON.parse(providerRef);
    return {
      match: parsed.match === true,
      detectedPlate: parsed.detectedPlate || '',
      score: parsed.score || 0,
      label: parsed.match ? 'Plate Match' : (parsed.detectedPlate ? 'Plate Mismatch' : 'No plate detected'),
    };
  } catch {
    const parts = providerRef.split('|');
    return {
      match: false,
      detectedPlate: parts[0] || '',
      score: parseFloat(parts[1]) || 0,
      label: parts[0] ? 'Plate Mismatch' : 'No plate detected',
    };
  }
}

const DOC_TYPE_LABELS = {
  bike_left: 'Side View',
  bike_rear: 'Rear + Plate',
};

export default function BikePhotoReviewPanel({ doc, onClose, onAction }) {
  const { toast } = useToast();
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const anpr = parseAnprDetails(doc.provider_reference, doc.document_type);
  const rider = doc.rider;
  const vehicle = doc.vehicle;

  async function handleApprove() {
    setProcessing(true);
    try {
      await base44.functions.invoke('processKycDecision', {
        docId: doc.id,
        userId: doc.user_id,
        action: 'approve',
      });
      toast({ title: 'Photo Approved', description: 'Rider has been notified via SMS.' });
      onAction();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setProcessing(false);
  }

  async function handleReject() {
    if (reason.trim().length < 10) return;
    setProcessing(true);
    try {
      await base44.functions.invoke('processKycDecision', {
        docId: doc.id,
        userId: doc.user_id,
        action: 'reject',
        reason: reason.trim(),
      });
      toast({ title: 'Photo Rejected', description: 'Rider has been notified via SMS.', variant: 'destructive' });
      onAction();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setProcessing(false);
  }

  const identityLabel = rider?.kyc_status === 'verified' ? 'Verified'
    : rider?.docupass_decision === 'accept' ? 'ID Accepted'
    : rider?.kyc_status || 'Pending';
  const identityClass = (rider?.kyc_status === 'verified' || rider?.docupass_decision === 'accept')
    ? 'text-success' : 'text-muted-foreground';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-end p-0 md:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => !processing && onClose()} />

      {/* Panel: bottom sheet on mobile, right-side panel on desktop */}
      <div className="relative bg-card w-full md:max-w-lg md:h-full md:max-h-[90vh] rounded-t-2xl md:rounded-2xl overflow-y-auto animate-fade-in max-h-[90vh]">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between z-10">
          <h3 className="font-heading font-bold text-sm">Review Bike Photo</h3>
          <button onClick={() => !processing && onClose()} className="p-1 hover:bg-accent rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Photo */}
          <div className="rounded-xl overflow-hidden border border-border">
            <img src={doc.file_url} alt={DOC_TYPE_LABELS[doc.document_type]} className="w-full object-contain max-h-80 bg-muted/30" />
          </div>

          {/* ANPR signal */}
          <div className="bg-muted/50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">ANPR Signal</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className={`font-semibold ${anpr.match === true ? 'text-success' : anpr.match === false && anpr.detectedPlate ? 'text-warning' : anpr.match === false ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {anpr.label}
                </p>
              </div>
              {anpr.detectedPlate && (
                <div>
                  <p className="text-muted-foreground">Detected Plate</p>
                  <p className="font-mono font-semibold">{anpr.detectedPlate}</p>
                </div>
              )}
              {vehicle?.plate_number && (
                <div>
                  <p className="text-muted-foreground">Registered Plate</p>
                  <p className="font-mono font-semibold">{vehicle.plate_number}</p>
                </div>
              )}
              {anpr.score > 0 && (
                <div>
                  <p className="text-muted-foreground">Confidence</p>
                  <p className="font-semibold">{(anpr.score * 100).toFixed(0)}%</p>
                </div>
              )}
            </div>
          </div>

          {/* Rider info */}
          <div className="bg-muted/50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Rider Information</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-semibold">{rider?.full_name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-semibold">{rider?.phone || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">National ID</p>
                <p className="font-semibold">{rider?.national_id || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Identity Status</p>
                <p className={`font-semibold ${identityClass}`}>{identityLabel}</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {!rejectMode ? (
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 bg-success text-success-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Approve
              </button>
              <button
                onClick={() => setRejectMode(true)}
                disabled={processing}
                className="flex-1 bg-destructive/10 text-destructive rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                Reject
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Rejection Reason (min 10 characters)</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this photo is being rejected..."
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-y"
                  disabled={processing}
                />
                <p className="text-[10px] text-muted-foreground mt-1">{reason.trim().length}/10 characters</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setRejectMode(false); setReason(''); }}
                  disabled={processing}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing || reason.trim().length < 10}
                  className="flex-1 bg-destructive text-destructive-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
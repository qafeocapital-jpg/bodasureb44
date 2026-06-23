import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CreditCard, ChevronLeft, Check, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import CameraCapture from '@/components/rider/onboarding/CameraCapture';

const CAPTURES = [
  { type: 'id_front', label: 'ID Front', sublabel: 'Front of your National ID', overlayType: 'rect' },
  { type: 'id_back', label: 'ID Back', sublabel: 'Back of your National ID', overlayType: 'rect' },
  { type: 'selfie', label: 'Selfie', sublabel: 'Your face — no helmet or sunglasses', overlayType: 'circle' },
];

export default function SubTaskIdentity({ user, kycDocs, onDataChange, onBack }) {
  const [nationalId, setNationalId] = useState(user?.national_id || '');
  const [savingId, setSavingId] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitResult, setSubmitResult] = useState(null);

  const idFrontDoc = kycDocs.find(d => d.document_type === 'id_front');
  const idBackDoc = kycDocs.find(d => d.document_type === 'id_back');
  const selfieDoc = kycDocs.find(d => d.document_type === 'selfie');

  const docs = { id_front: idFrontDoc, id_back: idBackDoc, selfie: selfieDoc };
  const allThreeUploaded = idFrontDoc?.file_url && idBackDoc?.file_url && selfieDoc?.file_url;
  const allApproved = idFrontDoc?.status === 'approved' && idBackDoc?.status === 'approved' && selfieDoc?.status === 'approved';
  const uploadedCount = CAPTURES.filter(c => docs[c.type]?.file_url).length;

  async function handleUpload(docType, fileUrl) {
    setError('');
    setSubmitResult(null);
    try {
      const existing = kycDocs.find(d => d.document_type === docType);
      const updateData = { file_url: fileUrl, status: 'pending', rejection_reason: null, provider_name: null, provider_reference: null };
      if (existing) {
        await base44.entities.KycDocument.update(existing.id, updateData);
      } else {
        await base44.entities.KycDocument.create({ user_id: user.id, document_type: docType, ...updateData });
      }
      await onDataChange();
    } catch (e) {
      setError(e.message || 'Failed to save document');
    }
  }

  async function handleSaveNationalId() {
    if (!nationalId.trim()) return;
    setSavingId(true);
    setError('');
    try {
      await base44.auth.updateMe({ national_id: nationalId.trim() });
      await onDataChange();
    } catch (e) {
      setError(e.message);
    }
    setSavingId(false);
  }

  async function handleSubmitIdentity() {
    if (!allThreeUploaded) return;
    setSubmitting(true);
    setError('');
    setSubmitResult(null);
    try {
      const res = await base44.functions.invoke('idAnalyzerSubmit', {
        idFrontUrl: idFrontDoc.file_url,
        idBackUrl: idBackDoc.file_url,
        selfieUrl: selfieDoc.file_url,
      });
      if (res.data?.success) {
        setSubmitResult({ decision: res.data.decision, extractedData: res.data.extractedData });
        await onDataChange();
      } else {
        setError(res.data?.error || 'Verification failed. Try again.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Verification failed. Try again.');
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="bg-muted text-foreground rounded-xl py-2.5 px-4 text-sm font-semibold flex items-center gap-1.5 w-full justify-center">
        <ChevronLeft className="w-4 h-4" /> Back to tasks
      </button>

      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-sm">Identity Verification</h3>
          <p className="text-[10px] text-muted-foreground">Upload your ID and selfie — verified instantly ({uploadedCount}/3)</p>
        </div>
      </div>

      {/* National ID number */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">National ID Number</label>
        <div className="flex gap-2 mt-1">
          <input
            value={nationalId}
            onChange={e => setNationalId(e.target.value)}
            placeholder="Enter your National ID"
            className="flex-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSaveNationalId}
            disabled={!nationalId.trim() || savingId}
            className="px-4 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {savingId ? '...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Mini progress bar */}
      <div className="flex gap-1.5">
        {CAPTURES.map(c => (
          <div key={c.type} className={`flex-1 h-1.5 rounded-full transition-colors ${docs[c.type]?.file_url ? 'bg-success' : 'bg-muted'}`} />
        ))}
      </div>

      {/* 3 captures */}
      {CAPTURES.map(c => {
        const doc = docs[c.type];
        return (
          <div key={c.type} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">{c.label}</p>
              {doc?.file_url && (
                <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: doc.status === 'approved' ? 'hsl(var(--success))' : doc.status === 'rejected' ? 'hsl(var(--destructive))' : 'hsl(var(--warning))' }}>
                  <Check className="w-3 h-3" />
                  {doc.status === 'approved' ? 'Verified' : doc.status === 'rejected' ? 'Rejected' : 'Uploaded'}
                </span>
              )}
            </div>
            <CameraCapture
              overlayType={c.overlayType}
              label={`Position: ${c.label}`}
              sublabel={c.sublabel}
              existingUrl={doc?.file_url}
              onUploaded={url => handleUpload(c.type, url)}
            />
          </div>
        );
      })}

      {/* Submit for verification */}
      {allThreeUploaded && !allApproved && (
        <button
          onClick={handleSubmitIdentity}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying with BodaSure AI...</> : <><ShieldCheck className="w-4 h-4" /> Submit for Verification</>}
        </button>
      )}

      {/* Results */}
      {submitResult?.decision === 'accept' && (
        <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-success" />
          <p className="text-xs text-success font-medium">Identity verified! Your KYC is being processed.</p>
        </div>
      )}
      {submitResult?.decision === 'review' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium">Documents submitted for review. Our team will verify shortly.</p>
        </div>
      )}
      {submitResult?.decision === 'reject' && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">Verification failed. Please retake your photos with better lighting and clarity.</p>
        </div>
      )}

      {allApproved && (
        <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-success" />
          <p className="text-xs text-success font-medium">Identity verified and approved!</p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
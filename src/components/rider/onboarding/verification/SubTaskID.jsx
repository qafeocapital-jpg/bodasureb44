import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CreditCard, ChevronLeft, Check, AlertTriangle } from 'lucide-react';
import CameraCapture from '@/components/rider/onboarding/CameraCapture';

export default function SubTaskID({ user, kycDocs, onDataChange, onBack }) {
  const [nationalId, setNationalId] = useState(user?.national_id || '');
  const [savingId, setSavingId] = useState(false);
  const [error, setError] = useState('');

  const idFrontDoc = kycDocs.find(d => d.document_type === 'id_front');
  const idBackDoc = kycDocs.find(d => d.document_type === 'id_back');

  async function handleUpload(docType, fileUrl) {
    setSavingId(true);
    setError('');
    try {
      const existing = kycDocs.find(d => d.document_type === docType);
      if (existing) {
        await base44.entities.KycDocument.update(existing.id, { file_url: fileUrl, status: 'pending', rejection_reason: null });
      } else {
        await base44.entities.KycDocument.create({
          user_id: user.id,
          document_type: docType,
          file_url: fileUrl,
          status: 'pending',
        });
      }
      await onDataChange();
    } catch (e) {
      setError(e.message || 'Failed to save document');
    }
    setSavingId(false);
  }

  async function handleSaveNationalId() {
    if (!nationalId.trim()) return;
    setSavingId(true);
    try {
      await base44.auth.updateMe({ national_id: nationalId.trim() });
      await onDataChange();
    } catch (e) {
      setError(e.message);
    }
    setSavingId(false);
  }

  const bothUploaded = idFrontDoc?.file_url && idBackDoc?.file_url;

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
          <h3 className="font-heading font-bold text-sm">ID Verification</h3>
          <p className="text-[10px] text-muted-foreground">Upload both sides of your National ID</p>
        </div>
      </div>

      {/* National ID field */}
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
            Save
          </button>
        </div>
      </div>

      {/* ID Front */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">ID Front</p>
          {idFrontDoc && <span className="flex items-center gap-1 text-[10px] text-success"><Check className="w-3 h-3" /> Uploaded</span>}
        </div>
        <CameraCapture
          overlayType="rect"
          label="Position ID Front"
          sublabel="Ensure all text is clearly visible"
          existingUrl={idFrontDoc?.file_url}
          onUploaded={url => handleUpload('id_front', url)}
        />
      </div>

      {/* ID Back */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">ID Back</p>
          {idBackDoc && <span className="flex items-center gap-1 text-[10px] text-success"><Check className="w-3 h-3" /> Uploaded</span>}
        </div>
        <CameraCapture
          overlayType="rect"
          label="Position ID Back"
          sublabel="Ensure all text is clearly visible"
          existingUrl={idBackDoc?.file_url}
          onUploaded={url => handleUpload('id_back', url)}
        />
      </div>

      {bothUploaded && (
        <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-success" />
          <p className="text-xs text-success font-medium">Both ID photos uploaded. Awaiting admin review.</p>
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
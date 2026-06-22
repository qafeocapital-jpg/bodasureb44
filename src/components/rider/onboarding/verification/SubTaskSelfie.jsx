import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { UserCircle, ChevronLeft, Check, AlertTriangle } from 'lucide-react';
import CameraCapture from '@/components/rider/onboarding/CameraCapture';

export default function SubTaskSelfie({ user, kycDocs, onDataChange, onBack }) {
  const [error, setError] = useState('');

  const selfieDoc = kycDocs.find(d => d.document_type === 'selfie');

  async function handleUpload(fileUrl) {
    setError('');
    try {
      const existing = kycDocs.find(d => d.document_type === 'selfie');
      if (existing) {
        await base44.entities.KycDocument.update(existing.id, { file_url: fileUrl, status: 'pending', rejection_reason: null });
      } else {
        await base44.entities.KycDocument.create({
          user_id: user.id,
          document_type: 'selfie',
          file_url: fileUrl,
          status: 'pending',
        });
      }
      await onDataChange();
    } catch (e) {
      setError(e.message || 'Failed to save selfie');
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4" /> Back to tasks
      </button>

      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <UserCircle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-sm">Rider Selfie</h3>
          <p className="text-[10px] text-muted-foreground">Profile photo with your ID number visible</p>
        </div>
      </div>

      {/* National ID label */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
        <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wide">Your National ID</p>
        <p className="text-lg font-heading font-bold text-amber-700">{user?.national_id || 'Not set'}</p>
        <p className="text-[10px] text-amber-600 mt-0.5">Hold a note with this number visible in the photo</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Profile Photo</p>
          {selfieDoc && <span className="flex items-center gap-1 text-[10px] text-success"><Check className="w-3 h-3" /> Uploaded</span>}
        </div>
        <CameraCapture
          overlayType="circle"
          label="Position your face"
          sublabel="No helmet · Face must fill the frame"
          existingUrl={selfieDoc?.file_url}
          onUploaded={handleUpload}
        />
      </div>

      <div className="bg-muted/50 rounded-xl p-3 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground">Requirements:</p>
        <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
          <li>No helmet or sunglasses</li>
          <li>Face must fill the circular frame</li>
          <li>Hold a note with your National ID number visible</li>
          <li>Good lighting — avoid shadows</li>
        </ul>
      </div>

      {selfieDoc?.file_url && (
        <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-success" />
          <p className="text-xs text-success font-medium">Selfie uploaded. Awaiting admin review.</p>
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
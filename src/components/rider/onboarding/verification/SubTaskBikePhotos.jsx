import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Bike, ChevronLeft, Check, AlertTriangle, RotateCw } from 'lucide-react';
import CameraCapture from '@/components/rider/onboarding/CameraCapture';
import PlateInput from '@/components/rider/onboarding/PlateInput';
import NtsaConfirmDialog from '@/components/rider/onboarding/NtsaConfirmDialog';

const BIKE_ANGLES = [
  { key: 'bike_front', label: 'Front', sublabel: 'Front view of the motorcycle' },
  { key: 'bike_left', label: 'Left Side', sublabel: 'Left side profile' },
  { key: 'bike_rear', label: 'Rear + Plate', sublabel: 'Rear with number plate visible' },
  { key: 'bike_right', label: 'Right Side', sublabel: 'Right side profile' },
];

export default function SubTaskBikePhotos({ user, vehicle, kycDocs, onDataChange, onBack }) {
  const [plateNumber, setPlateNumber] = useState(vehicle?.plate_number || '');
  const [savingPlate, setSavingPlate] = useState(false);
  const [error, setError] = useState('');
  const [activeAngle, setActiveAngle] = useState(0);
  const [showNtsaDialog, setShowNtsaDialog] = useState(false);

  async function handleUpload(docType, fileUrl) {
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
      setError(e.message || 'Failed to save photo');
    }
  }

  async function handleSavePlate() {
    if (plateNumber.trim().length !== 8 || !vehicle) return;
    setSavingPlate(true);
    try {
      await base44.entities.Vehicle.update(vehicle.id, { plate_number: plateNumber.trim() });
      await onDataChange();
    } catch (e) {
      setError(e.message);
    }
    setSavingPlate(false);
  }

  const uploadedCount = BIKE_ANGLES.filter(a => kycDocs.find(d => d.document_type === a.key && d.file_url)).length;
  const allUploaded = uploadedCount === 4;
  const currentAngle = BIKE_ANGLES[activeAngle];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="bg-muted text-foreground rounded-xl py-2.5 px-4 text-sm font-semibold flex items-center gap-1.5 w-full justify-center">
        <ChevronLeft className="w-4 h-4" /> Back to tasks
      </button>

      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bike className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-sm">Bike Photos</h3>
          <p className="text-[10px] text-muted-foreground">Capture all 4 angles ({uploadedCount}/4 done)</p>
        </div>
      </div>

      {/* Plate number */}
      {vehicle && (
        <div className="space-y-2">
          <PlateInput value={plateNumber} onChange={setPlateNumber} />
          <button
            onClick={() => setShowNtsaDialog(true)}
            disabled={plateNumber.trim().length !== 8 || savingPlate}
            className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {savingPlate ? 'Saving...' : 'Save Plate'}
          </button>
        </div>
      )}

      {/* Angle selector */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {BIKE_ANGLES.map((angle, i) => {
          const doc = kycDocs.find(d => d.document_type === angle.key && d.file_url);
          const isActive = i === activeAngle;
          return (
            <button
              key={angle.key}
              onClick={() => setActiveAngle(i)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : doc ? 'bg-success/10 text-success border border-success/20' : 'bg-muted text-muted-foreground'
              }`}
            >
              {doc && <Check className="w-3 h-3" />}
              {angle.label}
            </button>
          );
        })}
      </div>

      {/* Active angle camera */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold">{currentAngle.label}</p>
        <CameraCapture
          overlayType="rect-wide"
          label={`Position: ${currentAngle.label}`}
          sublabel={currentAngle.sublabel}
          existingUrl={kycDocs.find(d => d.document_type === currentAngle.key)?.file_url}
          onUploaded={url => handleUpload(currentAngle.key, url)}
        />
      </div>

      {/* Next angle button */}
      {!allUploaded && activeAngle < 3 && (
        <button
          onClick={() => setActiveAngle(activeAngle + 1)}
          className="w-full flex items-center justify-center gap-1 border border-border rounded-xl py-2.5 text-sm font-semibold"
        >
          Next Angle: {BIKE_ANGLES[activeAngle + 1].label} <RotateCw className="w-3.5 h-3.5" />
        </button>
      )}

      {allUploaded && (
        <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-success" />
          <p className="text-xs text-success font-medium">All 4 bike photos uploaded. Awaiting admin review.</p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
      <NtsaConfirmDialog
        open={showNtsaDialog}
        plate={plateNumber}
        confirmLabel="Confirm & Save"
        onConfirm={() => { setShowNtsaDialog(false); handleSavePlate(); }}
        onCancel={() => setShowNtsaDialog(false)}
      />
    </div>
  );
}
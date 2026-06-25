import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Bike, ChevronLeft, Check, AlertTriangle, RotateCw, Loader2, Camera } from 'lucide-react';
import CameraCapture from '@/components/rider/onboarding/CameraCapture';
import PlateInput from '@/components/rider/onboarding/PlateInput';
import NtsaConfirmDialog from '@/components/rider/onboarding/NtsaConfirmDialog';

const BIKE_ANGLES = [
  { key: 'bike_left', label: 'Side View', sublabel: 'Left side profile of the motorcycle' },
  { key: 'bike_rear', label: 'Rear + Plate', sublabel: 'Rear view with number plate visible' },
];

export default function SubTaskBikePhotos({ user, vehicle, kycDocs, onDataChange, onBack }) {
  const [plateNumber, setPlateNumber] = useState(vehicle?.plate_number || '');
  const [savingPlate, setSavingPlate] = useState(false);
  const [error, setError] = useState('');
  const [activeAngle, setActiveAngle] = useState(0);
  const [showNtsaDialog, setShowNtsaDialog] = useState(false);
  const [verifyingPlate, setVerifyingPlate] = useState(false);
  const [plateMismatch, setPlateMismatch] = useState(null);

  async function handleUpload(docType, fileUrl) {
    setError('');
    setPlateMismatch(null);
    try {
      // Plate recognition for bike_rear — soft warning, always saves the photo
      if (docType === 'bike_rear' && vehicle?.plate_number) {
        setVerifyingPlate(true);
        const res = await base44.functions.invoke('verifyPlateRecognizer', {
          imageUrl: fileUrl,
          expectedPlate: vehicle.plate_number,
        });
        setVerifyingPlate(false);
        const detectedPlate = res.data?.detectedPlate || '';
        const score = res.data?.score?.toFixed(2) || '0.00';
        const providerRef = `${detectedPlate}|${score}`;
        const isMatch = res.data?.match === true;

        const docData = {
          file_url: fileUrl,
          status: 'pending',
          provider_name: 'platerecognizer',
          provider_reference: providerRef,
          rejection_reason: isMatch ? null : `plate_mismatch: detected ${detectedPlate}`,
        };

        const existing = kycDocs.find(d => d.document_type === docType);
        if (existing) {
          await base44.entities.KycDocument.update(existing.id, docData);
        } else {
          await base44.entities.KycDocument.create({ user_id: user.id, document_type: docType, ...docData });
        }
        await onDataChange();

        if (!isMatch && detectedPlate) {
          setPlateMismatch({ detectedPlate, enteredPlate: vehicle.plate_number });
        }
        return;
      }

      // Normal upload for bike_left
      const existing = kycDocs.find(d => d.document_type === docType);
      if (existing) {
        await base44.entities.KycDocument.update(existing.id, { file_url: fileUrl, status: 'pending', rejection_reason: null });
      } else {
        await base44.entities.KycDocument.create({ user_id: user.id, document_type: docType, file_url: fileUrl, status: 'pending' });
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
      setPlateMismatch(null);
      await onDataChange();
    } catch (e) {
      setError(e.message);
    }
    setSavingPlate(false);
  }

  const uploadedCount = BIKE_ANGLES.filter(a => kycDocs.find(d => d.document_type === a.key && d.file_url)).length;
  const allUploaded = uploadedCount === 2;
  const currentAngle = BIKE_ANGLES[activeAngle];
  const hasPlateMismatch = kycDocs.some(d =>
    ['bike_left', 'bike_rear'].includes(d.document_type) &&
    d.rejection_reason &&
    d.rejection_reason.startsWith('plate_mismatch')
  );

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
          <p className="text-[10px] text-muted-foreground">Capture 2 photos ({uploadedCount}/2 done)</p>
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

      {verifyingPlate && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-warning animate-spin" />
          <p className="text-xs text-warning font-medium">Checking number plate...</p>
        </div>
      )}

      {/* Plate mismatch warning — non-blocking, photo already saved */}
      {plateMismatch && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-warning">Plate Mismatch</p>
              <p className="text-xs text-muted-foreground mt-1">
                The plate on your photo ({plateMismatch.detectedPlate}) does not match the plate you entered ({plateMismatch.enteredPlate}). You can retake the photo or update your plate number.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setPlateMismatch(null); setActiveAngle(BIKE_ANGLES.findIndex(a => a.key === 'bike_rear')); }}
              className="flex-1 flex items-center justify-center gap-1 border border-border rounded-lg py-2 text-xs font-semibold"
            >
              <Camera className="w-3.5 h-3.5" /> Retake Photo
            </button>
            <button
              onClick={() => { setPlateMismatch(null); }}
              className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-lg py-2 text-xs font-semibold"
            >
              Update Plate Number
            </button>
          </div>
        </div>
      )}

      {/* Persistent mismatch flag */}
      {hasPlateMismatch && !plateMismatch && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-2.5 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
          <p className="text-[10px] text-warning font-medium">Plate mismatch detected — update your plate number or retake the rear photo.</p>
        </div>
      )}

      {/* Next angle button */}
      {!allUploaded && activeAngle < 1 && (
        <button
          onClick={() => setActiveAngle(activeAngle + 1)}
          className="w-full flex items-center justify-center gap-1 border border-border rounded-xl py-2.5 text-sm font-semibold"
        >
          Next: {BIKE_ANGLES[activeAngle + 1].label} <RotateCw className="w-3.5 h-3.5" />
        </button>
      )}

      {allUploaded && (
        <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-success" />
          <p className="text-xs text-success font-medium">Both bike photos uploaded.</p>
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
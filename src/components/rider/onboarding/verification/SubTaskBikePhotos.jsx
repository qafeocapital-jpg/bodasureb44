import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Bike, ChevronLeft, Check, AlertTriangle, Loader2, Camera, Clock, ShieldCheck } from 'lucide-react';
import CameraCapture from '@/components/rider/onboarding/CameraCapture';
import PlateInput from '@/components/rider/onboarding/PlateInput';
import NtsaConfirmDialog from '@/components/rider/onboarding/NtsaConfirmDialog';

const BIKE_ANGLES = [
  { key: 'bike_left', label: 'Side View', sublabel: 'Left side profile of the motorcycle' },
  { key: 'bike_rear', label: 'Rear + Plate', sublabel: 'Rear view with number plate visible' },
];

export default function SubTaskBikePhotos({ user, vehicle, kycDocs, onDataChange, onBack }) {
  const navigate = useNavigate();
  const [plateNumber, setPlateNumber] = useState(vehicle?.plate_number || '');
  const [savingPlate, setSavingPlate] = useState(false);
  const [error, setError] = useState('');
  const [activeAngle, setActiveAngle] = useState(0);
  const [showNtsaDialog, setShowNtsaDialog] = useState(false);
  const [verifyingPlate, setVerifyingPlate] = useState(false);
  const [plateAdvisory, setPlateAdvisory] = useState(null);
  const [forceCamera, setForceCamera] = useState(false);

  async function handleUpload(docType, fileUrl) {
    setError('');
    setPlateAdvisory(null);
    try {
      // Plate recognition for bike_rear — soft signal, always saves photo as pending
      if (docType === 'bike_rear' && vehicle?.plate_number) {
        setVerifyingPlate(true);
        const res = await base44.functions.invoke('verifyPlateRecognizer', {
          imageUrl: fileUrl,
          expectedPlate: vehicle.plate_number,
        });
        setVerifyingPlate(false);
        const detectedPlate = res.data?.detectedPlate || '';
        const score = res.data?.score || 0;
        const isMatch = res.data?.match === true;
        const providerRef = JSON.stringify({ detectedPlate, score, match: isMatch });

        const docData = {
          file_url: fileUrl,
          status: 'pending',
          provider_name: 'platerecognizer',
          provider_reference: providerRef,
          rejection_reason: null,
        };

        const existing = kycDocs.find(d => d.document_type === docType);
        if (existing) {
          await base44.entities.KycDocument.update(existing.id, docData);
        } else {
          await base44.entities.KycDocument.create({ user_id: user.id, document_type: docType, ...docData });
        }
        setForceCamera(false);
        await onDataChange();

        if (!isMatch) {
          setPlateAdvisory({ detectedPlate, enteredPlate: vehicle.plate_number, hasPlate: !!detectedPlate });
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
      setForceCamera(false);
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
      setPlateAdvisory(null);
      await onDataChange();
    } catch (e) {
      setError(e.message);
    }
    setSavingPlate(false);
  }

  function selectAngle(i) {
    setActiveAngle(i);
    setForceCamera(false);
    setPlateAdvisory(null);
  }

  function getDocState(angleKey) {
    const doc = kycDocs.find(d => d.document_type === angleKey && d.file_url);
    if (!doc) return { state: 'none', doc: null };
    if (doc.status === 'approved') return { state: 'approved', doc };
    if (doc.status === 'rejected') return { state: 'rejected', doc };
    return { state: 'pending', doc };
  }

  const approvedCount = BIKE_ANGLES.filter(a => getDocState(a.key).state === 'approved').length;
  const allApproved = approvedCount === 2;
  const currentAngle = BIKE_ANGLES[activeAngle];
  const currentDocState = getDocState(currentAngle.key);
  const showCamera = forceCamera || currentDocState.state === 'none';

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/app')} className="bg-muted text-foreground rounded-xl py-2.5 px-4 text-sm font-semibold flex items-center gap-1.5 w-full justify-center">
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bike className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-sm">Bike Photos</h3>
          <p className="text-[10px] text-muted-foreground">{approvedCount}/2 approved</p>
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
          const ds = getDocState(angle.key);
          const isActive = i === activeAngle;
          const badgeClass = ds.state === 'approved'
            ? 'bg-success/10 text-success border border-success/20'
            : ds.state === 'rejected'
            ? 'bg-destructive/10 text-destructive border border-destructive/20'
            : 'bg-muted text-muted-foreground';
          return (
            <button
              key={angle.key}
              onClick={() => selectAngle(i)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : badgeClass
              }`}
            >
              {ds.state === 'approved' && <Check className="w-3 h-3" />}
              {ds.state === 'rejected' && <AlertTriangle className="w-3 h-3" />}
              {angle.label}
            </button>
          );
        })}
      </div>

      {/* Active angle content — 4-state rendering */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold">{currentAngle.label}</p>

        {showCamera ? (
          /* State: no doc or retake mode → show camera */
          <CameraCapture
            overlayType="rect-wide"
            label={`Position: ${currentAngle.label}`}
            sublabel={currentAngle.sublabel}
            existingUrl={null}
            onUploaded={url => handleUpload(currentAngle.key, url)}
          />
        ) : currentDocState.state === 'approved' ? (
          /* State: approved → hard-locked view */
          <div className="space-y-2">
            <div className="relative">
              <img src={currentDocState.doc.file_url} alt={currentAngle.label} className="w-full object-cover rounded-lg border-2 border-success/30" />
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-success/90 text-white rounded-full px-2 py-0.5 text-[10px] font-semibold">
                <ShieldCheck className="w-3 h-3" /> Approved
              </div>
            </div>
            <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-success flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-success">Approved — Locked</p>
                <p className="text-[10px] text-muted-foreground">Contact support to change.</p>
              </div>
            </div>
          </div>
        ) : currentDocState.state === 'rejected' ? (
          /* State: rejected → show photo + reason + retake button */
          <div className="space-y-2">
            <img src={currentDocState.doc.file_url} alt={currentAngle.label} className="w-full object-cover rounded-lg border-2 border-destructive/30" />
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-destructive">Photo Rejected</p>
                  <p className="text-xs text-muted-foreground mt-1">{currentDocState.doc.rejection_reason}</p>
                </div>
              </div>
              <button
                onClick={() => setForceCamera(true)}
                className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-lg py-2 text-xs font-semibold"
              >
                <Camera className="w-3.5 h-3.5" /> Retake Photo
              </button>
            </div>
          </div>
        ) : (
          /* State: pending → under review, no action needed */
          <div className="space-y-2">
            <div className="relative">
              <img src={currentDocState.doc.file_url} alt={currentAngle.label} className="w-full object-cover rounded-lg border-2 border-border" />
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-muted/90 text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">
                <Clock className="w-3 h-3" /> Under Review
              </div>
            </div>
            <div className="bg-muted/50 border border-border rounded-xl p-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Under Review</p>
                <p className="text-[10px] text-muted-foreground">No action needed — our team is reviewing your photo.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {verifyingPlate && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-warning animate-spin" />
          <p className="text-xs text-warning font-medium">Checking number plate...</p>
        </div>
      )}

      {/* Plate advisory — soft, non-blocking */}
      {plateAdvisory && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-warning">Plate Advisory</p>
              <p className="text-xs text-muted-foreground mt-1">
                {plateAdvisory.hasPlate
                  ? 'We noticed a plate issue — our team will review. You may retake if you wish.'
                  : "We couldn't detect a plate in your photo — our team will review. You may retake if you wish."}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setPlateAdvisory(null); setForceCamera(true); }}
              className="flex-1 flex items-center justify-center gap-1 border border-border rounded-lg py-2 text-xs font-semibold"
            >
              <Camera className="w-3.5 h-3.5" /> Retake Photo
            </button>
            <button
              onClick={() => setPlateAdvisory(null)}
              className="flex-1 bg-muted text-muted-foreground rounded-lg py-2 text-xs font-semibold"
            >
              Keep & Continue
            </button>
          </div>
        </div>
      )}

      {/* Next angle button */}
      {!allApproved && activeAngle < 1 && (
        <button
          onClick={() => selectAngle(activeAngle + 1)}
          className="w-full flex items-center justify-center gap-1 border border-border rounded-xl py-2.5 text-sm font-semibold"
        >
          Next: {BIKE_ANGLES[activeAngle + 1].label}
        </button>
      )}

      {allApproved && (
        <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-success" />
          <p className="text-xs text-success font-medium">Both bike photos approved.</p>
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
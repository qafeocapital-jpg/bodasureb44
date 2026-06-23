import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import { Check, AlertTriangle, Info, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import SignalBadge from '@/components/admin/flags/SignalBadge';
import ConfidenceBar from '@/components/admin/flags/ConfidenceBar';
import KycDocCard from '@/components/admin/flags/KycDocCard';
import AnprSignalCard from '@/components/admin/flags/AnprSignalCard';
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

const VEHICLE_DOC_TYPES = ['bike_front', 'bike_left', 'bike_rear', 'bike_right', 'logbook'];

const KYC_STATUS_COLORS = {
  unverified: 'grey',
  pending: 'amber',
  verified: 'green',
  rejected: 'red',
};

const DECISION_COLORS = { accept: 'green', review: 'amber', reject: 'red' };
const DECISION_ICONS = { accept: '✅ Accepted', review: '⚠ Review', reject: '❌ Rejected' };

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

export default function FlagReviewDrawer({ open, onOpenChange, issue, onResolved }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [docStates, setDocStates] = useState({});
  const [lightbox, setLightbox] = useState(null);
  const [plateResult, setPlateResult] = useState(null);
  const [plateLoading, setPlateLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [vehicleMode, setVehicleMode] = useState('none'); // 'none' | 'approve' | 'reject'
  const [vehicleRejectReason, setVehicleRejectReason] = useState('');

  const isVehicleMode = issue?.type?.startsWith('vehicle') ?? false;

  const loadData = useCallback(async () => {
    if (!issue) return;
    setLoading(true);
    setData(null);
    setDocStates({});
    setPlateResult(null);
    setVehicleMode('none');
    setVehicleRejectReason('');
    try {
      const res = await base44.functions.invoke('getFlagReviewData', {
        userId: issue.riderId,
        vehicleId: isVehicleMode ? issue.entityId : undefined,
      });
      setData(res.data);
    } catch (e) {
      toast({ title: 'Failed to load review data', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  }, [issue, isVehicleMode]);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  // Lazy plate recognizer call for vehicle mode
  useEffect(() => {
    if (!open || !isVehicleMode || !data) return;
    const bikeRear = data.kycDocs?.find((d) => d.document_type === 'bike_rear');
    if (!bikeRear?.file_url || !data.vehicle?.plate_number) return;
    fetchPlateResult(bikeRear.file_url, data.vehicle.plate_number);
  }, [open, isVehicleMode, data]);

  function fetchPlateResult(imageUrl, expectedPlate) {
    setPlateLoading(true);
    base44.functions
      .invoke('verifyPlateRecognizer', { imageUrl, expectedPlate })
      .then((res) => setPlateResult(res.data))
      .catch(() => setPlateResult(null))
      .finally(() => setPlateLoading(false));
  }

  async function handleDocDecision(doc, decision, rejectionReason) {
    setActing(true);
    try {
      const res = await base44.functions.invoke('processKycDecisionV2', {
        kycDocumentId: doc.id,
        decision,
        rejectionReason,
      });
      if (res.data?.success) {
        setDocStates((prev) => ({ ...prev, [doc.id]: decision }));
        toast({ title: `Document ${decision}` });
        if (doc.id === issue.entityId && onResolved) onResolved();
      }
    } catch (e) {
      toast({ title: 'Action failed', description: e.message, variant: 'destructive' });
    }
    setActing(false);
  }

  async function handleVehicleDecision(decision, rejectionReason) {
    setActing(true);
    try {
      const me = await base44.auth.me();
      const updateData = { status: decision };
      if (decision === 'approved') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by_id = me.id;
      } else {
        updateData.rejection_reason = rejectionReason;
      }
      await base44.entities.Vehicle.update(issue.entityId, updateData);
      toast({ title: `Vehicle ${decision}` });
      if (onResolved) onResolved();
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Action failed', description: e.message, variant: 'destructive' });
    }
    setActing(false);
  }

  const rider = data?.rider;
  const kycDocs = data?.kycDocs || [];
  const vehicle = data?.vehicle;
  const signals = data?.idAnalyzerSignals;

  // KYC mode: show all ID/Selfie docs; Vehicle mode: show bike docs
  const displayDocs = isVehicleMode
    ? kycDocs.filter((d) => VEHICLE_DOC_TYPES.includes(d.document_type))
    : kycDocs;

  const bikeRearDoc = kycDocs.find((d) => d.document_type === 'bike_rear');
  const namesMatch =
    signals?.extractedName && rider?.full_name
      ? signals.extractedName.toLowerCase().trim() === rider.full_name.toLowerCase().trim()
      : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[600px] flex flex-col p-0">
        {/* Sticky Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <SheetTitle className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {loading ? (
                <div className="h-5 w-32 bg-muted rounded animate-pulse" />
              ) : (
                <p className="text-lg font-heading font-bold truncate">{rider?.full_name || '—'}</p>
              )}
              <p className="text-sm text-muted-foreground">{rider?.phone || '—'}</p>
            </div>
            {rider && (
              <SignalBadge color={KYC_STATUS_COLORS[rider.kyc_status] || 'grey'}>
                KYC: {rider.kyc_status}
              </SignalBadge>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-6 w-40 bg-muted rounded animate-pulse" />
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <p className="text-sm">No data available</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold mb-3">Documents &amp; Provider Signals</h3>

                {/* Vehicle info card (vehicle mode only) */}
                {isVehicleMode && vehicle && (
                  <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-mono font-bold">{vehicle.plate_number}</span>
                      <SignalBadge color={vehicle.status === 'approved' ? 'green' : vehicle.status === 'rejected' ? 'red' : 'amber'}>
                        {vehicle.status}
                      </SignalBadge>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div><span className="text-muted-foreground">Make:</span> {vehicle.make || '—'}</div>
                      <div><span className="text-muted-foreground">Model:</span> {vehicle.model || '—'}</div>
                      <div><span className="text-muted-foreground">Color:</span> {vehicle.color || '—'}</div>
                      <div><span className="text-muted-foreground">County:</span> {vehicle.county_name || '—'}</div>
                    </div>
                  </div>
                )}

                {/* Document grid */}
                {displayDocs.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {displayDocs.map((doc) => (
                      <KycDocCard
                        key={doc.id}
                        doc={doc}
                        localStatus={docStates[doc.id]}
                        isHighlighted={!isVehicleMode && doc.id === issue?.entityId}
                        onImageClick={() => doc.file_url && setLightbox(doc.file_url)}
                        onDecision={handleDocDecision}
                        acting={acting}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground">No documents found</p>
                  </div>
                )}

                {/* ANPR Signal Card (vehicle mode, if bike_rear exists) */}
                {isVehicleMode && bikeRearDoc && vehicle?.plate_number && (
                  <div className="mt-4">
                    <AnprSignalCard
                      result={plateResult}
                      loading={plateLoading}
                      registeredPlate={vehicle.plate_number}
                      onRecheck={() => fetchPlateResult(bikeRearDoc.file_url, vehicle.plate_number)}
                    />
                  </div>
                )}

                {/* Provider Signals Panel (KYC mode only) */}
                {!isVehicleMode && (
                  <div className="mt-4 pt-4 border-t border-border">
                    {signals ? (
                      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-primary" /> ID Analyzer Signals
                        </h4>

                        {/* Decision */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-20">Decision:</span>
                          <SignalBadge color={DECISION_COLORS[signals.decision] || 'grey'}>
                            {DECISION_ICONS[signals.decision] || signals.decision}
                          </SignalBadge>
                        </div>

                        {/* Face confidence */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Face Match</span>
                            {signals.faceConfidence != null ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold">{(signals.faceConfidence * 100).toFixed(0)}%</span>
                                <SignalBadge color={faceConfidenceColor(signals.faceConfidence)}>
                                  {faceConfidenceLabel(signals.faceConfidence)}
                                </SignalBadge>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not captured</span>
                            )}
                          </div>
                          {signals.faceConfidence != null && (
                            <ConfidenceBar value={signals.faceConfidence} color={faceConfidenceColor(signals.faceConfidence)} />
                          )}
                        </div>

                        {/* Name comparison */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-20">ID says:</span>
                            <span className="text-xs font-mono">{signals.extractedName || '—'}</span>
                            {namesMatch !== null && (namesMatch ? (
                              <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-20">Registered:</span>
                            <span className="text-xs font-mono">{rider?.full_name || '—'}</span>
                          </div>
                        </div>

                        {/* DOB + Doc Number + Provider Ref */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <span className="text-[10px] text-muted-foreground">Extracted DOB</span>
                            <p className="text-xs font-mono">{signals.extractedDob || '—'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground">Document #</span>
                            <p className="text-xs font-mono">{signals.documentNumber || '—'}</p>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Provider Reference</span>
                          <p className="text-xs font-mono break-all">{signals.providerReference || '—'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted rounded-xl p-4 flex items-center gap-2">
                        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">Manually Submitted — No AI Analysis</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer (vehicle mode only) */}
        {isVehicleMode && !loading && vehicle && vehicle.status === 'pending' && (
          <div className="border-t border-border px-6 py-4 flex-shrink-0 space-y-2">
            {vehicleMode === 'reject' && (
              <div className="space-y-1.5">
                <textarea
                  value={vehicleRejectReason}
                  onChange={(e) => setVehicleRejectReason(e.target.value)}
                  placeholder="Rejection reason (min 10 chars)..."
                  rows={2}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVehicleDecision('rejected', vehicleRejectReason)}
                    disabled={acting || vehicleRejectReason.trim().length < 10}
                    className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Confirm Reject
                  </button>
                  <button
                    onClick={() => { setVehicleMode('none'); setVehicleRejectReason(''); }}
                    className="px-4 rounded-xl border border-border text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {vehicleMode === 'none' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleVehicleDecision('approved')}
                  disabled={acting}
                  className="flex-1 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Approve Vehicle
                </button>
                <button
                  onClick={() => setVehicleMode('reject')}
                  disabled={acting}
                  className="flex-1 border border-red-500 text-red-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
                >
                  Reject Vehicle
                </button>
              </div>
            )}
          </div>
        )}
      </SheetContent>

      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </Sheet>
  );
}
export const VERIFICATION_TASKS = [
  { id: 'identity', name: 'Identity Verification', short: 'Identity' },
  { id: 'bike', name: 'Bike Photos', short: 'Bike' },
  { id: 'owner', name: 'Owner Verification', short: 'Owner' },
];

/**
 * Compute sub-task statuses from KYC docs, user, vehicle, and wallet.
 * @returns Array of { id, status } where status is: not_started | in_progress | submitted | verified
 */
export function getTaskStatuses(kycDocs = [], user, vehicle, wallet) {
  // Task 0: Identity Verification (IDAnalyzer DocuPass only)
  // Only consider docs with provider_reference (IDAnalyzer-processed)
  const idFrontProcessed = kycDocs.find(d => d.document_type === 'id_front' && d.provider_reference);
  const idBackProcessed = kycDocs.find(d => d.document_type === 'id_back' && d.provider_reference);
  const selfieProcessed = kycDocs.find(d => d.document_type === 'selfie' && d.provider_reference);
  const processedCount = [idFrontProcessed, idBackProcessed, selfieProcessed].filter(Boolean).length;
  const allThreeProcessed = processedCount === 3;
  const allThreeApproved = idFrontProcessed?.status === 'approved' &&
    idBackProcessed?.status === 'approved' &&
    selfieProcessed?.status === 'approved';
  const anyIdRejected = [idFrontProcessed, idBackProcessed, selfieProcessed].some(d => d?.status === 'rejected');
  const identityStatus = allThreeApproved ? 'verified'
    : anyIdRejected ? 'rejected'
    : allThreeProcessed ? 'submitted'
    : 'not_started';

  // Task 1: Bike Photos — both angles must be admin-approved for 'verified'
  const bikeLeftDoc = kycDocs.find(d => d.document_type === 'bike_left' && d.file_url);
  const bikeRearDoc = kycDocs.find(d => d.document_type === 'bike_rear' && d.file_url);
  const bikeLeftApproved = bikeLeftDoc?.status === 'approved';
  const bikeRearApproved = bikeRearDoc?.status === 'approved';
  const bikeAnyRejected = [bikeLeftDoc, bikeRearDoc].some(d => d?.status === 'rejected');
  const bikeStatus = (bikeLeftApproved && bikeRearApproved) ? 'verified'
    : bikeAnyRejected ? 'rejected'
    : (bikeLeftDoc && bikeRearDoc) ? 'submitted'
    : (bikeLeftDoc || bikeRearDoc) ? 'in_progress'
    : 'not_started';

  // Task 2: Owner Verification
  const ownerStatus = vehicle
    ? (vehicle.is_owner_rider === true || vehicle.owner_verified === true)
      ? 'verified'
      : vehicle.owner_invite_sent_at ? 'in_progress' : 'not_started'
    : 'not_started';

  return [
    { id: 'identity', status: identityStatus },
    { id: 'bike', status: bikeStatus },
    { id: 'owner', status: ownerStatus },
  ];
}

/**
 * Check if all tasks are at submitted or verified.
 */
export function isAllSubmitted(tasks = []) {
  return tasks.every(t => t.status === 'submitted' || t.status === 'verified');
}

/**
 * Get a compact verification level for badge display.
 * Uses user fields for performance (no KYC doc fetch needed).
 */
export function getVerificationLevel(user) {
  if (!user) return 'unverified';
  if (user.kyc_status === 'verified' || user.verification_complete) return 'verified';
  if (user.phone_verified) return 'partial';
  return 'unverified';
}

export const VERIFICATION_LEVEL_CONFIG = {
  verified: { label: 'Verified', className: 'bg-success/10 text-success' },
  submitted: { label: 'Submitted', className: 'bg-blue-50 text-blue-600' },
  partial: { label: 'Partial', className: 'bg-amber-50 text-amber-600' },
  unverified: { label: 'Unverified', className: 'bg-muted text-muted-foreground' },
};

export const TASK_STATUS_CONFIG = {
  not_started: { label: 'Not Started', icon: 'circle', className: 'text-muted-foreground', bg: 'bg-muted' },
  in_progress: { label: 'In Progress', icon: 'clock', className: 'text-amber-600', bg: 'bg-amber-50' },
  processing: { label: 'Processing', icon: 'clock', className: 'text-amber-600 animate-pulse', bg: 'bg-amber-50' },
  submitted: { label: 'Submitted', icon: 'check', className: 'text-blue-600', bg: 'bg-blue-50' },
  verified: { label: 'Verified', icon: 'check-circle', className: 'text-success', bg: 'bg-success/10' },
  rejected: { label: 'Rejected', icon: 'x-circle', className: 'text-destructive', bg: 'bg-destructive/10' },
};
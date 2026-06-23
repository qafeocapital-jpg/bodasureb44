export const VERIFICATION_TASKS = [
  { id: 'identity', name: 'Identity Verification', short: 'Identity' },
  { id: 'bike', name: 'Bike Photos', short: 'Bike' },
  { id: 'phone', name: 'Phone OTP', short: 'Phone' },
  { id: 'owner', name: 'Owner Verification', short: 'Owner' },
];

/**
 * Compute sub-task statuses from KYC docs, user, and vehicle.
 * @returns Array of { id, status } where status is: not_started | in_progress | submitted | verified
 */
export function getTaskStatuses(kycDocs = [], user, vehicle) {
  // Task 1: Identity Verification (ID front + ID back + Selfie — batched)
  const idFront = kycDocs.find(d => d.document_type === 'id_front' && d.file_url);
  const idBack = kycDocs.find(d => d.document_type === 'id_back' && d.file_url);
  const selfie = kycDocs.find(d => d.document_type === 'selfie' && d.file_url);
  const idFrontApproved = kycDocs.some(d => d.document_type === 'id_front' && d.status === 'approved');
  const idBackApproved = kycDocs.some(d => d.document_type === 'id_back' && d.status === 'approved');
  const selfieApproved = kycDocs.some(d => d.document_type === 'selfie' && d.status === 'approved');
  const allThreeApproved = idFrontApproved && idBackApproved && selfieApproved;
  const uploadedCount = [idFront, idBack, selfie].filter(Boolean).length;
  const identityStatus = allThreeApproved ? 'verified'
    : uploadedCount === 3 ? 'submitted'
    : uploadedCount > 0 ? 'in_progress'
    : 'not_started';

  // Task 2: Bike Photos
  const bikeTypes = ['bike_front', 'bike_left', 'bike_rear', 'bike_right'];
  const bikeDocs = bikeTypes.map(t => kycDocs.find(d => d.document_type === t && d.file_url));
  const bikeUploaded = bikeDocs.filter(Boolean).length;
  const bikeAllApproved = bikeTypes.every(t => kycDocs.some(d => d.document_type === t && d.status === 'approved'));
  const bikeStatus = bikeAllApproved ? 'verified'
    : bikeUploaded === 4 ? 'submitted'
    : bikeUploaded > 0 ? 'in_progress'
    : 'not_started';

  // Task 3: Phone OTP
  const phoneStatus = user?.phone_verified ? 'verified' : 'not_started';

  // Task 4: Owner Verification
  const ownerStatus = vehicle
    ? (vehicle.is_owner_rider === true || vehicle.owner_verified === true)
      ? 'verified'
      : vehicle.owner_invite_sent_at ? 'in_progress' : 'not_started'
    : 'not_started';

  return [
    { id: 'identity', status: identityStatus },
    { id: 'bike', status: bikeStatus },
    { id: 'phone', status: phoneStatus },
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
  if (user.kyc_status === 'approved') return 'verified';
  if (user.verification_complete) return 'submitted';
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
  submitted: { label: 'Submitted', icon: 'check', className: 'text-blue-600', bg: 'bg-blue-50' },
  verified: { label: 'Verified', icon: 'check-circle', className: 'text-success', bg: 'bg-success/10' },
};
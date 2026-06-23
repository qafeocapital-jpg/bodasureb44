// SasaPay Personal Onboarding Configuration & Flow
// Per: https://developer.sasapay.app/docs/apis/waas/onboard-customers?country=ke

export const PERSONAL_ONBOARDING_STEPS = [
  { id: 'init_request', name: 'Request OTP', description: 'Send OTP to rider phone' },
  { id: 'otp_confirmation', name: 'Confirm OTP', description: 'Verify OTP to create SasaPay account' },
  { id: 'kyc_upload', name: 'Upload KYC', description: 'Upload ID, selfie, and bike photos to SasaPay' },
];

export const SASAPAY_DOCUMENT_TYPES = {
  id_card: { value: '1', label: 'ID Card' },
  passport: { value: '2', label: 'Passport' },
  alien_id: { value: '3', label: 'Alien ID' },
};

export const SASAPAY_ACCOUNT_STATUSES = {
  ACTIVE: { label: 'Active', className: 'bg-success/10 text-success' },
  AWAITING_KYC_UPLOAD: { label: 'Awaiting KYC', className: 'bg-amber-50 text-amber-600' },
  PENDING: { label: 'Pending', className: 'bg-blue-50 text-blue-600' },
  REJECTED: { label: 'Rejected', className: 'bg-destructive/10 text-destructive' },
};
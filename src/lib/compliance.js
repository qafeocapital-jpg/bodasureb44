// Compliance score computation — shared between rider page and admin views

/**
 * Computes compliance score and tier from user/vehicle/KYC/group data.
 * @returns { score: number, tier: string }
 */
export function computeComplianceScore(user, vehicle, kycDocs, groupMembers) {
  const scores = {
    bike_approved: vehicle?.status === 'approved' ? 25 : 0,
    kyc_approved: user?.kyc_status === 'verified' ? 25 : 0,
    id_verified:
      kycDocs?.some(d => d.document_type === 'id_front' && d.status === 'approved') &&
      kycDocs?.some(d => d.document_type === 'id_back' && d.status === 'approved')
        ? 25 : 0,
    sacco_member: groupMembers?.length > 0 ? 25 : 0,
  };

  const score = Object.values(scores).reduce((a, b) => a + b, 0);

  let tier;
  if (score >= 85) tier = 'Fully Verified';
  else if (score >= 65) tier = 'Road-Ready';
  else if (score >= 40) tier = 'Partial';
  else tier = 'Non-Compliant';

  return { score, tier, breakdown: scores };
}
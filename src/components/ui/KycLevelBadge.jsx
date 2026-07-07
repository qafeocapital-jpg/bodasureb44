import { Shield, Clock, ShieldCheck } from 'lucide-react';

/**
 * Derives KYC status from user/wallet data.
 * Unverified: Not yet submitted documents
 * Pending Review: Documents submitted, under review
 * Verified: All documents approved, full access unlocked
 */
export function getKycLevel(user, wallet) {
  if (!user) return 0;
  if (user.kyc_status === 'verified' || user.verification_complete) return 2;
  if (user.kyc_status === 'pending' || user.kyc_status === 'pending_confirmation') return 1;
  return 0;
}

export const KYC_LEVEL_CONFIG = {
  0: { label: 'Unverified', desc: 'Not yet verified', sub: 'Basic access', icon: Shield, badgeClass: 'bg-muted text-muted-foreground border-border' },
  1: { label: 'Pending Review', desc: 'Under review', sub: 'Waiting for approval', icon: Clock, badgeClass: 'bg-warning/10 text-warning border-warning/20' },
  2: { label: 'Verified ✓', desc: 'Fully verified', sub: 'Full access unlocked', icon: ShieldCheck, badgeClass: 'bg-success/10 text-success border-success/20' },
};

export default function KycLevelBadge({ user, wallet, size = 'sm' }) {
  const level = getKycLevel(user, wallet);
  const config = KYC_LEVEL_CONFIG[level];
  const Icon = config.icon;
  const padding = size === 'lg' ? 'px-3 py-1' : 'px-2 py-0.5';
  const textSize = size === 'lg' ? 'text-xs' : 'text-[10px]';
  const iconSize = size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  return (
    <span className={`inline-flex items-center gap-1 font-semibold border rounded-full ${padding} ${textSize} ${config.badgeClass}`}>
      <Icon className={iconSize} />
      {config.label}
    </span>
  );
}
import { Shield, Clock, ShieldCheck } from 'lucide-react';

/**
 * Derives KYC level (0, 1, or 2) from user/wallet data.
 * Level 0: Not Verified — basic access
 * Level 1: ID Submitted — waiting check
 * Level 2: Verified — full access unlocked
 */
export function getKycLevel(user, wallet) {
  if (!user) return 0;
  if (user.kyc_status === 'approved' || user.wallet_tier >= 2) return 2;
  if (user.kyc_status === 'pending' || user.wallet_tier === 1) return 1;
  return 0;
}

export const KYC_LEVEL_CONFIG = {
  0: { label: 'Level 0', desc: 'Not Verified', sub: 'Basic access', icon: Shield, badgeClass: 'bg-muted text-muted-foreground border-border' },
  1: { label: 'Level 1', desc: 'ID Submitted', sub: 'Waiting check', icon: Clock, badgeClass: 'bg-warning/10 text-warning border-warning/20' },
  2: { label: 'Level 2', desc: 'Verified ✓', sub: 'Full access unlocked', icon: ShieldCheck, badgeClass: 'bg-success/10 text-success border-success/20' },
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
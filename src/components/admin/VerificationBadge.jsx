import { ShieldCheck, Clock, Circle, AlertCircle } from 'lucide-react';
import { getVerificationLevel, VERIFICATION_LEVEL_CONFIG } from '@/lib/verification';

/**
 * Compact inline verification badge for portal rider lists.
 * Uses user fields for badge level — no KYC doc fetch needed.
 */
export default function VerificationBadge({ user, onClick }) {
  const level = getVerificationLevel(user);
  const config = VERIFICATION_LEVEL_CONFIG[level];
  const Icon = level === 'verified' ? ShieldCheck : level === 'submitted' ? Clock : level === 'partial' ? AlertCircle : Circle;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 ${config.className} ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </button>
  );
}
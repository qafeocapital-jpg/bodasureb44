import { Shield, Clock } from 'lucide-react';
import { getKycLevel, KYC_LEVEL_CONFIG } from '@/components/ui/KycLevelBadge';

export default function KycTierStatus({ user, vehicle, kycDocs, groupMember }) {
  const level = getKycLevel(user);
  const config = KYC_LEVEL_CONFIG[level];
  const Icon = config.icon;

  return (
    <div className="mb-6">
      {/* Current Tier Card */}
      <div className={`rounded-2xl p-5 border mb-4 ${
        level === 2
          ? 'bg-success/10 border-success/20'
          : level === 1
          ? 'bg-warning/10 border-warning/20'
          : 'bg-muted border-border'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          <Icon className={`w-5 h-5 ${
            level === 2
              ? 'text-success'
              : level === 1
              ? 'text-warning'
              : 'text-muted-foreground'
          }`} />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Current KYC Status
            </p>
            <p className={`text-lg font-heading font-bold ${
              level === 2
                ? 'text-success'
                : level === 1
                ? 'text-warning'
                : 'text-foreground'
            }`}>
              {config.label}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{config.desc}</p>
      </div>
    </div>
  );
}
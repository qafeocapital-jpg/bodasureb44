import { Shield, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { getKycLevel, KYC_LEVEL_CONFIG } from '@/components/ui/KycLevelBadge';

export default function KycTierStatus({ user, vehicle, kycDocs, groupMember }) {
  const level = getKycLevel(user);
  const config = KYC_LEVEL_CONFIG[level];
  const Icon = config.icon;

  // Determine what's needed for tier 2
  const tier2Requirements = [
    {
      label: 'ID Verification',
      complete: kycDocs?.some(d => d.document_type === 'id_front' && d.status === 'approved') &&
                kycDocs?.some(d => d.document_type === 'id_back' && d.status === 'approved'),
      hint: 'Front and back of your national ID'
    },
    {
      label: 'Bike Registration',
      complete: vehicle?.status === 'approved',
      hint: 'Vehicle details and photos approved'
    },
    {
      label: 'Profile Complete',
      complete: user?.full_name && user?.phone && user?.national_id,
      hint: 'Full name, phone, and national ID'
    },
    {
      label: 'Selfie Verification',
      complete: kycDocs?.some(d => d.document_type === 'selfie' && d.status === 'approved'),
      hint: 'Clear selfie photo on file'
    },
  ];

  const completedCount = tier2Requirements.filter(r => r.complete).length;
  const allComplete = completedCount === tier2Requirements.length;

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

      {/* Tier 2 Progress (only show if not already tier 2) */}
      {level < 2 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-success" />
            <h3 className="font-heading font-bold text-sm">What's needed for Tier 2</h3>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">
                {completedCount} of {tier2Requirements.length} completed
              </p>
              <span className="text-xs font-bold text-success">
                {Math.round((completedCount / tier2Requirements.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-success transition-all duration-300"
                style={{ width: `${(completedCount / tier2Requirements.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Requirements Checklist */}
          <div className="space-y-2">
            {tier2Requirements.map((req, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                  req.complete
                    ? 'bg-success/5 border-success/20'
                    : 'bg-muted/50 border-border'
                }`}
              >
                <div className={`w-4 h-4 rounded-full mt-0.5 flex-shrink-0 flex items-center justify-center text-[9px] font-bold ${
                  req.complete
                    ? 'bg-success text-success-foreground'
                    : 'bg-muted border border-border'
                }`}>
                  {req.complete && '✓'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    req.complete ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {req.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{req.hint}</p>
                </div>
              </div>
            ))}
          </div>

          {allComplete && (
            <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              <p className="text-xs text-success">
                All requirements met! Your KYC is pending admin review.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
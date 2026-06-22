import { Check, Lock } from 'lucide-react';

const TIER1_FEATURES = [
  'Wallet & Balance',
  'Lipa County / Pay Fees',
  'Lipisha / Collect Fare',
  'Compliance & Permits',
];

const TIER2_FEATURES = [
  'Lipa Owner / Pay Owner',
  'Chama Contributions',
  'Insurance Products',
  'Full Feature Access',
];

export default function TierBenefitsCard() {
  return (
    <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 border border-orange-200 rounded-2xl p-5 mb-6">
      {/* Header */}
      <div className="text-center mb-5">
        <h3 className="text-base font-heading font-bold text-foreground">Why Verify?</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Unlock more features and earn more with BodaSure
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tier 1 */}
        <div className="bg-white/80 rounded-xl p-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-semibold mb-2">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            Tier 1
          </span>
          <ul className="space-y-2">
            {TIER1_FEATURES.map(feature => (
              <li key={feature} className="flex items-start gap-1.5">
                <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                <span className="text-xs text-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tier 2 */}
        <div className="bg-white/80 rounded-xl p-3 ring-2 ring-success/30">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded-full text-[10px] font-semibold mb-2">
            <span className="w-1.5 h-1.5 bg-success rounded-full" />
            Tier 2
          </span>
          <ul className="space-y-2">
            {TIER2_FEATURES.map(feature => (
              <li key={feature} className="flex items-start gap-1.5">
                <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                <span className="text-xs text-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA */}
      <p className="text-xs text-center text-muted-foreground mt-4 italic">
        Complete these tasks to unlock Tier 2 and access the full BodaSure experience.
      </p>
    </div>
  );
}
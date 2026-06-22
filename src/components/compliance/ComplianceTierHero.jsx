import { Shield, AlertTriangle, Flag, CheckCircle2 } from 'lucide-react';

const tierConfig = {
  'Fully Verified': {
    bg: 'from-green-600 to-emerald-600',
    icon: CheckCircle2,
    textColor: 'text-green-50',
    label: '✓ Fully Verified',
  },
  'Road-Ready': {
    bg: 'from-blue-600 to-cyan-600',
    icon: Flag,
    textColor: 'text-blue-50',
    label: '◉ Road-Ready',
  },
  Partial: {
    bg: 'from-amber-500 to-orange-600',
    icon: AlertTriangle,
    textColor: 'text-amber-50',
    label: '! Partial',
  },
  'Non-Compliant': {
    bg: 'from-red-600 to-rose-600',
    icon: AlertTriangle,
    textColor: 'text-red-50',
    label: '✕ Non-Compliant',
  },
};

export default function ComplianceTierHero({ tier, score }) {
  const config = tierConfig[tier] || tierConfig['Non-Compliant'];
  const Icon = config.icon;

  return (
    <div className={`bg-gradient-to-br ${config.bg} text-primary-foreground rounded-2xl p-6 mb-6`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-6 h-6" />
        <p className={`text-lg font-heading font-bold ${config.textColor}`}>{config.label}</p>
      </div>
      <p className={`text-sm ${config.textColor} opacity-90`}>Compliance Score</p>
      <p className="text-4xl font-heading font-extrabold mt-2">{score}%</p>
      <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-white rounded-full transition-all" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
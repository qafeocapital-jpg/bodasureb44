// Status filter cards for KYC compliance dashboard
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

const STATUS_FILTERS = [
  { key: 'all', label: 'All', icon: null },
  { key: 'unverified', label: 'Unverified', icon: AlertCircle },
  { key: 'pending', label: 'Under Review', icon: Clock },
  { key: 'verified', label: 'Verified', icon: CheckCircle2 },
  { key: 'rejected', label: 'Rejected', icon: AlertCircle },
];

export default function ComplianceStatusCards({ statusCounts, activeFilter, onFilterChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {STATUS_FILTERS.map(s => {
        const Icon = s.icon;
        return (
          <button
            key={s.key}
            onClick={() => onFilterChange(s.key)}
            className={`p-3 rounded-xl border transition-all ${
              activeFilter === s.key
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-card border-border hover:border-primary'
            }`}
          >
            {Icon && <Icon className="w-4 h-4 mb-1" />}
            <p className="text-xs font-semibold">{s.label}</p>
            <p className={`text-lg font-bold ${activeFilter === s.key ? 'text-white' : 'text-foreground'}`}>
              {statusCounts[s.key]}
            </p>
          </button>
        );
      })}
    </div>
  );
}
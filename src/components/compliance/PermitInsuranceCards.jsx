import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { formatDate, formatKES } from '@/lib/format';

function ExpiryCard({ title, status, daysRemaining, expiryDate, amount, renewLink, type }) {
  const isExpired = daysRemaining !== null && daysRemaining < 0;
  const isExpiringSoon = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;
  const isActive = daysRemaining !== null && daysRemaining > 7;

  let statusBg = 'bg-muted';
  let statusText = 'text-muted-foreground';
  let statusLabel = 'Inactive';

  if (isExpired) {
    statusBg = 'bg-destructive/10';
    statusText = 'text-destructive';
    statusLabel = 'Expired';
  } else if (isExpiringSoon) {
    statusBg = 'bg-warning/10';
    statusText = 'text-warning';
    statusLabel = 'Expiring Soon';
  } else if (isActive) {
    statusBg = 'bg-success/10';
    statusText = 'text-success';
    statusLabel = 'Active';
  }

  if (!status) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-sm font-semibold mb-3">{title}</p>
        <div className={`rounded-xl p-4 text-center ${statusBg}`}>
          <p className={`text-xs font-semibold ${statusText}`}>Not Set Up</p>
        </div>
        <Link
          to={renewLink}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Get {type === 'permit' ? 'Permit' : 'Insurance'} →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-sm font-semibold mb-3">{title}</p>

      <div className={`rounded-xl p-4 mb-4 ${statusBg}`}>
        <p className={`text-xs font-bold ${statusText} uppercase tracking-wide`}>
          {statusLabel}
        </p>
        {daysRemaining !== null && !isExpired && (
          <p className={`text-sm font-bold mt-1 ${statusText}`}>
            {daysRemaining === 0 ? 'Expires today' : `Expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      {expiryDate && (
        <div className="text-xs text-muted-foreground mb-4">
          <p>Valid Until: <span className="font-mono">{formatDate(expiryDate)}</span></p>
          {amount && <p>Amount Paid: {formatKES(amount)}</p>}
        </div>
      )}

      <Link
        to={renewLink}
        className="w-full flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 font-semibold text-sm hover:bg-accent transition-colors"
      >
        Renew →
      </Link>
    </div>
  );
}

export default function PermitInsuranceCards({
  permit,
  policy,
  permitDaysRemaining,
  insuranceDaysRemaining,
}) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <ExpiryCard
        title="County Permit"
        status={permit ? 'active' : null}
        daysRemaining={permitDaysRemaining}
        expiryDate={permit?.end_date}
        amount={permit?.amount_paid_cents}
        renewLink="/app/lipa-county"
        type="permit"
      />
      <ExpiryCard
        title="Insurance"
        status={policy ? 'active' : null}
        daysRemaining={insuranceDaysRemaining}
        expiryDate={policy?.end_date}
        amount={policy?.premium_cents}
        renewLink="/app/insurance"
        type="insurance"
      />
    </div>
  );
}
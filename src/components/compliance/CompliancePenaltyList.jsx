// Pending penalties list with Pay Now actions
import { formatKES, formatDate } from '@/lib/format';
import { AlertTriangle } from 'lucide-react';

export default function CompliancePenaltyList({ penalties, wallet, onPay }) {
  if (!penalties || penalties.length === 0) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h2 className="font-heading font-bold text-sm text-destructive">
          Pending Penalties ({penalties.length})
        </h2>
      </div>
      <div className="space-y-2">
        {penalties.map((p) => (
          <div
            key={p.id}
            className="bg-card border border-border rounded-xl p-3 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-semibold">{formatKES(p.amount_cents)}</p>
              <p className="text-xs text-muted-foreground">{p.reason}</p>
              {p.created_date && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Issued: {formatDate(p.created_date)}
                </p>
              )}
            </div>
            <button
              onClick={() => onPay(p)}
              disabled={!wallet || wallet.status !== 'active'}
              className="bg-destructive text-destructive-foreground rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              Pay Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
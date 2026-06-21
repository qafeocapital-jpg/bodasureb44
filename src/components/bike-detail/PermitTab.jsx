import { Link } from 'react-router-dom';
import { QrCode, Plus, BadgeCheck, ChevronRight, Link as LinkIcon } from 'lucide-react';
import { formatKES, formatDate } from '@/lib/format';

const accentMap = {
  orange: { solidBtn: 'bg-primary text-primary-foreground' },
  emerald: { solidBtn: 'bg-emerald-600 text-white' },
  blue: { solidBtn: 'bg-blue-600 text-white' },
};

export default function PermitTab({ permits, isStaff, onIssuePermit, accent = 'orange', certificateUrl }) {
  const a = accentMap[accent] || accentMap.orange;
  const activePermit = permits.find(p => p.status === 'active');
  const pastPermits = permits.filter(p => p.status !== 'active');

  return (
    <div className="space-y-4">
      {activePermit ? (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <BadgeCheck className="w-4 h-4" /> Active Permit
            </span>
            <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5 capitalize">{activePermit.billing_cycle}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Period</span>
              <span className="font-medium">{formatDate(activePermit.start_date)} → {formatDate(activePermit.end_date)}</span>
            </div>
            {activePermit.amount_paid_cents > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-bold">{formatKES(activePermit.amount_paid_cents)}</span>
              </div>
            )}
            {activePermit.qr_code_data && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <QrCode className="w-3.5 h-3.5" /> {activePermit.qr_code_data}
              </div>
            )}
          </div>
          {certificateUrl && (
            <Link to={certificateUrl} className="flex items-center justify-center gap-1.5 mt-3 text-xs font-semibold text-primary bg-white/60 rounded-lg py-2">
              <LinkIcon className="w-3.5 h-3.5" /> View Certificate <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-muted/50 rounded-xl p-6 text-center">
          <QrCode className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No active permit</p>
        </div>
      )}

      {isStaff && (
        <button onClick={onIssuePermit} className={`flex items-center justify-center gap-1.5 w-full ${a.solidBtn} rounded-xl py-2.5 text-sm font-semibold`}>
          <Plus className="w-4 h-4" /> Issue Manual Permit
        </button>
      )}

      {pastPermits.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Permit History</h3>
          <div className="space-y-2">
            {pastPermits.map(p => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium capitalize">{p.billing_cycle}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.start_date)} → {formatDate(p.end_date)}</p>
                </div>
                <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5 capitalize">{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
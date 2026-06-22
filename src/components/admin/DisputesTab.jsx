import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { formatKES, formatDateTime } from '@/lib/format';
import { auditLog } from '@/lib/audit';
import { Scale, CheckCircle2, RotateCw, Loader2 } from 'lucide-react';

export default function DisputesTab() {
  const { toast } = useToast();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [failedTxns, events] = await Promise.all([
        base44.entities.Transaction.filter({ status: 'failed' }, '-created_date', 50),
        base44.entities.PaymentEvent.filter({}, '-created_date', 50),
      ]);
      const errorEvents = events.filter(e =>
        (e.event_type && (e.event_type.includes('mismatch') || e.event_type.includes('error')))
      );
      const txRefs = new Set(failedTxns.map(t => t.reference));
      const extraDisputes = errorEvents
        .filter(e => e.reference && !txRefs.has(e.reference))
        .map(e => ({
          id: e.id,
          created_date: e.created_date,
          reference: e.reference,
          type: e.event_type || 'payment_error',
          amount_cents: 0,
          failure_reason: 'Payment event error',
          is_event: true,
        }));
      setDisputes([...failedTxns.map(t => ({ ...t, is_event: false })), ...extraDisputes]);
    } catch (e) {}
    setLoading(false);
  }

  async function markResolved(dispute) {
    if (dispute.is_event) {
      toast({ title: 'Cannot resolve', description: 'This is a payment event log, not a transaction.', variant: 'destructive' });
      return;
    }
    setActioning(dispute.id);
    try {
      const u = await base44.auth.me();
      await base44.entities.Transaction.update(dispute.id, { status: 'reversed' });
      await auditLog({ userId: u.id, action: 'dispute_resolved', entityType: 'Transaction', entityId: dispute.id, description: `Dispute resolved — transaction ${dispute.reference} marked as reversed` });
      toast({ title: 'Dispute Resolved', description: `Transaction ${dispute.reference} has been reversed.` });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setActioning(null);
  }

  async function retry(dispute) {
    if (dispute.is_event) {
      toast({ title: 'Cannot retry', description: 'This is a payment event log.', variant: 'destructive' });
      return;
    }
    if (!dispute.checkout_request_id) {
      toast({ title: 'Cannot retry', description: 'No checkout reference available for retry.', variant: 'destructive' });
      return;
    }
    setActioning(dispute.id);
    try {
      const result = await base44.functions.invoke('sasapayQueryStatus', { checkout_request_id: dispute.checkout_request_id });
      toast({ title: 'Status Re-checked', description: result?.data?.status || 'Query completed' });
      load();
    } catch (e) {
      toast({ title: 'Retry failed', description: e.message, variant: 'destructive' });
    }
    setActioning(null);
  }

  if (loading) return <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>;

  if (disputes.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <Scale className="w-10 h-10 mx-auto text-success mb-2" />
        <p className="text-sm font-medium text-success">No payment disputes</p>
        <p className="text-xs text-muted-foreground mt-1">All transactions are processing normally.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status/Reason</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {disputes.map(d => (
            <tr key={d.id} className="border-t border-border hover:bg-accent/50">
              <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(d.created_date)}</td>
              <td className="px-4 py-3 font-mono text-xs">{d.reference || '—'}</td>
              <td className="px-4 py-3 text-xs capitalize">{(d.type || 'unknown').replace(/_/g, ' ')}</td>
              <td className="px-4 py-3 text-xs font-semibold">{d.amount_cents ? formatKES(d.amount_cents) : '—'}</td>
              <td className="px-4 py-3">
                <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-destructive/10 text-destructive">
                  {d.failure_reason || d.status || 'failed'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button
                    onClick={() => markResolved(d)}
                    disabled={actioning === d.id}
                    className="flex items-center gap-1 bg-success/10 text-success rounded-lg px-2 py-1 text-xs font-semibold hover:bg-success/20 disabled:opacity-50"
                  >
                    {actioning === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Resolve
                  </button>
                  <button
                    onClick={() => retry(d)}
                    disabled={actioning === d.id}
                    className="flex items-center gap-1 bg-blue-50 text-blue-600 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-blue-100 disabled:opacity-50"
                  >
                    <RotateCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
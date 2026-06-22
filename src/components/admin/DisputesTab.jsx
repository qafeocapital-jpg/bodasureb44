import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { formatKES, formatDateTime } from '@/lib/format';
import { auditLog } from '@/lib/audit';
import { Scale, CheckCircle2, RotateCw, Loader2, Gavel, XCircle, MessageSquare } from 'lucide-react';

export default function DisputesTab() {
  const { toast } = useToast();
  const [disputes, setDisputes] = useState([]);
  const [formalDisputes, setFormalDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolveAction, setResolveAction] = useState('resolved');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [failedTxns, events, formal] = await Promise.all([
        base44.entities.Transaction.filter({ status: 'failed' }, '-created_date', 50),
        base44.entities.PaymentEvent.filter({}, '-created_date', 50),
        base44.entities.Dispute.filter({}, '-created_date', 50),
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
      setFormalDisputes(formal);
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

  async function resolveFormalDispute() {
    if (!resolveTarget || !resolutionNotes.trim()) {
      toast({ title: 'Resolution notes required', description: 'Please add resolution notes before closing.', variant: 'destructive' });
      return;
    }
    setActioning(resolveTarget.id);
    try {
      const u = await base44.auth.me();
      await base44.entities.Dispute.update(resolveTarget.id, {
        status: resolveAction,
        resolution_notes: resolutionNotes.trim(),
        resolved_by_id: u.id,
        resolved_at: new Date().toISOString(),
      });
      await auditLog({
        userId: u.id,
        action: `dispute_${resolveAction}`,
        entityType: 'Dispute',
        entityId: resolveTarget.id,
        description: `Dispute "${resolveTarget.reason}" ${resolveAction === 'resolved' ? 'resolved' : 'rejected'}: ${resolutionNotes.trim()}`,
      });
      toast({ title: 'Dispute Updated', description: `Marked as ${resolveAction}.` });
      setResolveTarget(null);
      setResolutionNotes('');
      setResolveAction('resolved');
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setActioning(null);
  }

  if (loading) return <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>;

  return (
    <div className="space-y-6">
      {/* Formal Rider-Filed Disputes */}
      <div>
        <h3 className="text-sm font-heading font-bold mb-3 flex items-center gap-2">
          <Gavel className="w-4 h-4" /> Rider-Filed Disputes ({formalDisputes.length})
        </h3>
        {formalDisputes.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <Gavel className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No rider-filed disputes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {formalDisputes.map(d => (
              <div key={d.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-violet-50 text-violet-600 capitalize">{(d.category || 'other').replace(/_/g, ' ')}</span>
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                        d.status === 'open' ? 'bg-warning/10 text-warning'
                        : d.status === 'under_review' ? 'bg-blue-50 text-blue-600'
                        : d.status === 'resolved' ? 'bg-success/10 text-success'
                        : 'bg-destructive/10 text-destructive'
                      }`}>{(d.status || 'open').replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm font-semibold">{d.reason}</p>
                    {d.description && <p className="text-xs text-muted-foreground mt-1">{d.description}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(d.created_date)}{d.transaction_reference ? ` · Ref: ${d.transaction_reference}` : ''}</p>
                    {d.resolution_notes && (
                      <div className="mt-2 bg-accent rounded-lg p-2 flex items-start gap-1.5">
                        <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-foreground">{d.resolution_notes}</p>
                      </div>
                    )}
                  </div>
                  {(d.status === 'open' || d.status === 'under_review') && (
                    <button
                      onClick={() => { setResolveTarget(d); setResolutionNotes(d.resolution_notes || ''); setResolveAction('resolved'); }}
                      className="flex items-center gap-1 bg-primary text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 flex-shrink-0 ml-3"
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Disputes (failed transactions) */}
      <div>
        <h3 className="text-sm font-heading font-bold mb-3 flex items-center gap-2">
          <Scale className="w-4 h-4" /> Payment Disputes ({disputes.length})
        </h3>
        {disputes.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <Scale className="w-8 h-8 mx-auto text-success mb-2" />
            <p className="text-sm font-medium text-success">No payment disputes</p>
            <p className="text-xs text-muted-foreground mt-1">All transactions are processing normally.</p>
          </div>
        ) : (
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
        )}
      </div>

      {/* Resolve Formal Dispute Modal */}
      {resolveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setResolveTarget(null)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-heading font-bold text-lg mb-1">Review Dispute</h3>
            <p className="text-xs text-muted-foreground mb-3">{resolveTarget.reason}</p>
            {resolveTarget.description && (
              <div className="bg-accent rounded-lg p-3 mb-4">
                <p className="text-xs text-muted-foreground">Rider's description:</p>
                <p className="text-sm mt-1">{resolveTarget.description}</p>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setResolveAction('resolved')}
                  className={`flex-1 flex items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-semibold border-2 ${resolveAction === 'resolved' ? 'border-success bg-success/10 text-success' : 'border-border'}`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Resolve
                </button>
                <button
                  onClick={() => setResolveAction('rejected')}
                  className={`flex-1 flex items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-semibold border-2 ${resolveAction === 'rejected' ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border'}`}
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Resolution Notes *</label>
                <textarea
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  placeholder="Explain the decision to the rider..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setResolveTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button
                  onClick={resolveFormalDispute}
                  disabled={actioning === resolveTarget.id || !resolutionNotes.trim()}
                  className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {actioning === resolveTarget.id ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
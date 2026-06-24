import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw, RotateCcw, AlertCircle, CheckCircle2, ExternalLink, Inbox } from 'lucide-react';

const EVENT_LABELS = {
  docupass_conclusive: 'Verification Complete',
  docupass_document_upload: 'Document Upload',
};

function formatTimestamp(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString();
}

export default function WebhookDeliveriesList() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [retryResult, setRetryResult] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('idAnalyzerWebhookDeliveries', { action: 'list' });
      setDeliveries(res.data.deliveries || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRetry(deliveryId) {
    setRetryingId(deliveryId);
    setRetryResult(prev => ({ ...prev, [deliveryId]: null }));
    try {
      const res = await base44.functions.invoke('idAnalyzerWebhookDeliveries', {
        action: 'retry',
        deliveryId,
      });
      setRetryResult(prev => ({ ...prev, [deliveryId]: res.data }));
      // Refresh list after a short delay
      setTimeout(() => load(), 2000);
    } catch (e) {
      setRetryResult(prev => ({
        ...prev,
        [deliveryId]: { success: false, error: e.response?.data?.error || e.message },
      }));
    }
    setRetryingId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-destructive font-medium">Failed to load deliveries</p>
          <p className="text-[10px] text-destructive/80 mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No webhook deliveries found</p>
      </div>
    );
  }

  const failedCount = deliveries.filter(d => d.failed).length;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
        <span className="text-xs text-muted-foreground">
          {deliveries.length} delivery{deliveries.length !== 1 ? 'ies' : 'y'} total
        </span>
        <div className="flex items-center gap-3">
          {failedCount > 0 && (
            <span className="text-[10px] font-semibold text-destructive bg-destructive/10 rounded-full px-2 py-0.5">
              {failedCount} failed
            </span>
          )}
          <button onClick={load} className="text-muted-foreground hover:text-foreground" disabled={loading}>
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Deliveries */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {deliveries.map(d => {
          const result = retryResult[d.id];
          const isRetrying = retryingId === d.id;
          return (
            <div
              key={d.id}
              className={`border rounded-lg p-3 space-y-2 ${d.failed ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/30'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {d.failed ? (
                      <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                    )}
                    <span className="text-xs font-semibold truncate">
                      {EVENT_LABELS[d.event] || d.event || 'Unknown'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{d.id}</p>
                </div>
                <button
                  onClick={() => handleRetry(d.id)}
                  disabled={!d.canResend || isRetrying}
                  className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isRetrying ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3 h-3" />
                  )}
                  Retry
                </button>
              </div>

              {/* URL */}
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="font-mono truncate">{d.url}</span>
              </div>

              {/* Error message */}
              {d.errorMessage && (
                <div className="text-[10px] text-destructive bg-destructive/10 rounded px-2 py-1">
                  {d.errorMessage}
                </div>
              )}

              {/* Timestamps */}
              <div className="flex justify-between text-[9px] text-muted-foreground pt-1 border-t border-border/50">
                <span>Created: {formatTimestamp(d.createdAt)}</span>
                <span>Last attempt: {formatTimestamp(d.lastAttempt)}</span>
              </div>

              {/* Retry result */}
              {result && (
                <div className={`text-[10px] rounded px-2 py-1.5 ${result.success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {result.success ? (
                    <span>✓ Retry initiated — IDAnalyzer will re-send to the webhook URL</span>
                  ) : (
                    <span>✗ {result.error}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* URL warning */}
      {deliveries.length > 0 && deliveries[0]?.url?.includes('/api/fn/') && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-700">Webhook URL is wrong in IDAnalyzer profile</p>
            <p className="text-[10px] text-amber-600 mt-1">
              The URL is set to <code className="font-mono">/api/fn/idAnalyzerCallback</code> but should be{' '}
              <code className="font-mono">/functions/idAnalyzerCallback</code>. Fix this in the IDAnalyzer portal
              (Profile → Webhook URL), then retry deliveries.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
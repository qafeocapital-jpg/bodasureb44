import { Loader2, X, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Payment Pending Sheet — shows a "Waiting for M-Pesa..." card while
 * polling for transaction completion. Displays reference number, spinner,
 * and handles timeout gracefully.
 *
 * Props:
 *   - open: boolean
 *   - onClose: () => void
 *   - reference: string (transaction reference)
 *   - status: 'pending' | 'completed' | 'failed' | 'timeout' | null
 *   - attempts: number
 *   - maxAttempts: number (default 12)
 *   - message: string (custom message)
 *   - onRetry: () => void (optional — called when user clicks "Check again")
 */
export default function PaymentPendingSheet({
  open,
  onClose,
  reference,
  status,
  attempts = 0,
  maxAttempts = 12,
  message,
  onRetry,
}) {
  if (!open) return null;

  const progress = Math.min((attempts / maxAttempts) * 100, 100);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={status === 'pending' ? undefined : onClose} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[512px] bg-card rounded-t-3xl p-6 pb-24 animate-slide-up max-h-[85vh] overflow-y-auto z-[61]">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            {status === 'pending' && <Loader2 className="w-6 h-6 text-primary animate-spin" />}
            {status === 'completed' && <RefreshCw className="w-6 h-6 text-success" />}
            {status === 'failed' && <AlertCircle className="w-6 h-6 text-destructive" />}
            {status === 'timeout' && <AlertCircle className="w-6 h-6 text-warning" />}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-accent"
            disabled={status === 'pending'}
          >
            <X className={`w-5 h-5 text-muted-foreground ${status === 'pending' ? 'opacity-40' : ''}`} />
          </button>
        </div>

        {status === 'pending' && (
          <>
            <h3 className="font-heading font-bold text-lg mb-1">Waiting for M-Pesa</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {message || 'Check your phone for the M-Pesa prompt and enter your PIN to confirm.'}
            </p>

            {reference && (
              <div className="bg-accent rounded-xl p-3 mb-4">
                <p className="text-xs text-muted-foreground">Reference</p>
                <p className="text-sm font-mono font-semibold">{reference}</p>
              </div>
            )}

            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2 mb-2 overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Checking... ({attempts}/{maxAttempts})
            </p>

            <button
              onClick={onClose}
              className="w-full mt-5 text-center text-sm text-muted-foreground py-2"
            >
              I didn't receive a prompt
            </button>
          </>
        )}

        {status === 'completed' && (
          <>
            <h3 className="font-heading font-bold text-lg mb-1 text-success">Payment Complete!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your payment has been confirmed successfully.
            </p>
            {reference && (
              <div className="bg-accent rounded-xl p-3 mb-4">
                <p className="text-xs text-muted-foreground">Reference</p>
                <p className="text-sm font-mono font-semibold">{reference}</p>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm"
            >
              Done
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <h3 className="font-heading font-bold text-lg mb-1 text-destructive">Payment Failed</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The payment could not be completed. Please try again.
            </p>
            {reference && (
              <div className="bg-accent rounded-xl p-3 mb-4">
                <p className="text-xs text-muted-foreground">Reference</p>
                <p className="text-sm font-mono font-semibold">{reference}</p>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm"
            >
              Try Again
            </button>
          </>
        )}

        {status === 'timeout' && (
          <>
            <h3 className="font-heading font-bold text-lg mb-1 text-warning">Still Processing</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your payment may still be completing. Check your M-Pesa SMS for confirmation.
              If money was deducted, your wallet will be updated automatically.
            </p>
            {reference && (
              <div className="bg-accent rounded-xl p-3 mb-4">
                <p className="text-xs text-muted-foreground">Reference</p>
                <p className="text-sm font-mono font-semibold">{reference}</p>
              </div>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm mb-2"
              >
                Check Again
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full text-center text-sm text-muted-foreground py-2"
            >
              Close
            </button>
          </>
        )}
      </div>
    </>
  );
}
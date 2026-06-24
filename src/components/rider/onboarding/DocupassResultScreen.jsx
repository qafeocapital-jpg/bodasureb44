import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle, Clock, AlertTriangle, ArrowRight, LifeBuoy, RefreshCw } from 'lucide-react';

/**
 * Full-screen DocuPass result screen.
 * outcome: 'accepted' | 'review' | 'rejected'
 */
export default function DocupassResultScreen({
  outcome,
  user,
  kycDocs,
  attemptCount,
  onDismiss,
  onGoToDashboard,
  onContactSupport,
  onRefresh,
}) {
  const [polling, setPolling] = useState(false);

  // For 'review': poll for updates every 5s for up to 30s
  useEffect(() => {
    if (outcome !== 'review') return;
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 6;
    const timer = setInterval(async () => {
      attempts++;
      if (onRefresh) await onRefresh();
      if (attempts >= maxAttempts) {
        setPolling(false);
        clearInterval(timer);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [outcome]);

  // Fire confetti on accepted
  useEffect(() => {
    if (outcome === 'accepted') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } }), 200);
      setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } }), 400);
    }
  }, [outcome]);

  if (outcome === 'accepted') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-success" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-center mb-2">Identity Verified!</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">Your identity has been successfully verified.</p>

        {(user?.id_extracted_name || user?.id_extracted_dob || user?.national_id) && (
          <div className="w-full max-w-sm bg-card border border-border rounded-xl p-4 space-y-3 mb-6">
            {user?.id_extracted_name && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Full Name</span>
                <span className="font-medium">{user.id_extracted_name}</span>
              </div>
            )}
            {user?.id_extracted_dob && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date of Birth</span>
                <span className="font-medium">{user.id_extracted_dob}</span>
              </div>
            )}
            {user?.national_id && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">National ID</span>
                <span className="font-medium font-mono">{user.national_id}</span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onGoToDashboard}
          className="w-full max-w-sm flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm"
        >
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (outcome === 'review') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <Clock className="w-12 h-12 text-amber-600 animate-pulse" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-center mb-2">Under Review</h1>
        <p className="text-sm text-muted-foreground text-center mb-2 max-w-sm">
          Your verification is being processed by IDAnalyzer. This usually takes a few moments.
        </p>
        {polling ? (
          <p className="text-xs text-amber-600 mb-6 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" /> Checking for updates…
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mb-6">We'll notify you via SMS once complete.</p>
        )}

        <button
          onClick={onGoToDashboard}
          className="w-full max-w-sm flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm"
        >
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (outcome === 'rejected') {
    const canRetry = attemptCount < 3;
    const rejectedDoc = kycDocs.find(d => d.status === 'rejected' && d.provider_reference);
    const rejectionReason = rejectedDoc?.rejection_reason || 'Verification did not pass. Please ensure your ID is clear and well-lit.';

    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-center mb-2">Verification Failed</h1>
        <p className="text-sm text-muted-foreground text-center mb-4">Attempt {attemptCount} of 3</p>

        <div className="w-full max-w-sm bg-destructive/5 border border-destructive/20 rounded-xl p-4 mb-6">
          <p className="text-xs text-destructive font-medium mb-1">Reason</p>
          <p className="text-sm text-destructive">{rejectionReason}</p>
        </div>

        {canRetry ? (
          <button
            onClick={onDismiss}
            className="w-full max-w-sm flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        ) : (
          <button
            onClick={onContactSupport}
            className="w-full max-w-sm flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm"
          >
            <LifeBuoy className="w-4 h-4" /> Contact Support
          </button>
        )}
      </div>
    );
  }

  return null;
}
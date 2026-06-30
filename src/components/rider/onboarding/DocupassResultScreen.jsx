import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Clock, AlertTriangle, ArrowRight, LifeBuoy, RefreshCw, FileUser, Loader2, ShieldCheck } from 'lucide-react';

/**
 * Full-screen DocuPass result screen.
 * decision: 'accept' | 'review' | 'reject' (values from IDAnalyzer webhook)
 * Props: decision, user, kycDocs, attemptCount, onDismiss, onGoToDashboard, onContactSupport
 */
export default function DocupassResultScreen({
  decision,
  user,
  kycDocs,
  attemptCount,
  onDismiss,
  onGoToDashboard,
  onContactSupport,
  onRefresh,
}) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // Polling handled by SubTaskIdentity; this component removed to avoid duplicate polling
  // See issue #L3 fix: only SubTaskIdentity manages the polling loop

  // Fire confetti on accepted
  useEffect(() => {
    if (decision === 'accept' || decision === 'pending_confirmation') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } }), 200);
      setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } }), 400);
    }
  }, [decision]);

  async function handleConfirmDetails() {
    setConfirming(true);
    setConfirmError('');
    try {
      const res = await base44.functions.invoke('confirmKycDetails', {});
      if (res.data?.success) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        if (onRefresh) await onRefresh();
        onGoToDashboard();
      } else {
        setConfirmError(res.data?.error || 'Failed to confirm. Please try again.');
      }
    } catch (e) {
      setConfirmError(e.response?.data?.error || e.message || 'Failed to confirm. Please try again.');
    }
    setConfirming(false);
  }

  // --- PENDING CONFIRMATION: Confirm Your Details screen ---
  if (decision === 'pending_confirmation') {
    const selfieDoc = kycDocs.find(d => d.document_type === 'selfie' && d.provider_reference);
    const selfieUrl = user?.avatar_url || selfieDoc?.file_url;

    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 animate-fade-in overflow-y-auto">
        <div className="w-full max-w-sm flex flex-col items-center">
          {/* Selfie photo from IDAnalyzer */}
          {selfieUrl ? (
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-success/20 mb-4 shadow-lg">
              <img src={selfieUrl} alt="Verified selfie" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <ShieldCheck className="w-12 h-12 text-success" />
            </div>
          )}

          <h1 className="text-2xl font-heading font-bold text-center mb-2">Confirm Your Details</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            We extracted these details from your ID. Please confirm they're correct.
          </p>

          {/* Details card */}
          <div className="w-full bg-card border border-border rounded-xl divide-y divide-border overflow-hidden mb-6">
            <DetailRow label="Full Name" value={user?.id_extracted_name || user?.full_name} />
            <DetailRow label="National ID" value={user?.national_id} mono />
            <DetailRow label="Date of Birth" value={user?.id_extracted_dob || user?.date_of_birth} />
          </div>

          {confirmError && (
            <div className="w-full bg-destructive/5 border border-destructive/20 rounded-xl p-3 mb-4 text-center">
              <p className="text-sm text-destructive">{confirmError}</p>
            </div>
          )}

          {/* Primary CTA — green confirm button */}
          <button
            onClick={handleConfirmDetails}
            disabled={confirming}
            className="w-full flex items-center justify-center gap-2 bg-success text-success-foreground rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50"
          >
            {confirming
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming…</>
              : <><CheckCircle className="w-4 h-4" /> Confirm — These are my details</>}
          </button>

          {/* Secondary — contact support */}
          <button
            onClick={onContactSupport}
            className="w-full mt-3 text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Something looks wrong? Contact support
          </button>
        </div>
      </div>
    );
  }

  if (decision === 'accept') {
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

  if (decision === 'review') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <Clock className="w-12 h-12 text-amber-600 animate-pulse" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-center mb-2">Under Review</h1>
        <p className="text-sm text-muted-foreground text-center mb-2 max-w-sm">
          Your verification is being processed by IDAnalyzer. This usually takes a few moments.
        </p>
        <p className="text-xs text-muted-foreground mb-6">We'll notify you via SMS once complete.</p>

        <button
          onClick={onGoToDashboard}
          className="w-full max-w-sm flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm"
        >
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // GAP 4: Mismatch reject UI - profile data doesn't match ID document
  if (decision === 'mismatch_reject') {
    const mismatchReason = user?.kyc_mismatch_reason || 'Details on your profile do not match your ID document.';
    const mismatchParts = mismatchReason.split(' | ');

    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <FileUser className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-center mb-2">Details Don't Match</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">The information on your profile doesn't match your ID document.</p>

        <div className="w-full max-w-sm bg-destructive/5 border border-destructive/20 rounded-xl p-4 mb-6 space-y-3">
          {mismatchParts.map((part, idx) => (
            <div key={idx}>
              {idx > 0 && <div className="border-t border-destructive/20 my-2" />}
              <p className="text-xs text-destructive font-medium mb-1">Mismatch Detected</p>
              <p className="text-sm text-destructive">{part}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/app/profile')}
          className="w-full max-w-sm flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm mb-3"
        >
          <FileUser className="w-4 h-4" /> Update Profile
        </button>
        <p className="text-xs text-muted-foreground text-center">After updating, return here to try again.</p>
      </div>
    );
  }

  if (decision === 'reject') {
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

function DetailRow({ label, value, mono }) {
  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CreditCard, FileText, User, ChevronLeft, Check, AlertTriangle, Loader2, ShieldCheck, Clock, LifeBuoy } from 'lucide-react';
import DocupassOverlay from './DocupassOverlay';

const STEPS = [
  { icon: CreditCard, title: 'ID Front', desc: 'Photograph the front of your National ID' },
  { icon: FileText, title: 'ID Back', desc: 'Photograph the back of your National ID' },
  { icon: User, title: 'Face Liveness', desc: 'Complete a quick face movement check' },
];

export default function SubTaskIdentity({ user, kycDocs, onDataChange, onBack }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [docupassUrl, setDocupassUrl] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const pollTimerRef = useRef(null);

  // Only consider IDAnalyzer-processed docs (with provider_reference)
  const idFrontDoc = kycDocs.find(d => d.document_type === 'id_front' && d.provider_reference);
  const idBackDoc = kycDocs.find(d => d.document_type === 'id_back' && d.provider_reference);
  const selfieDoc = kycDocs.find(d => d.document_type === 'selfie' && d.provider_reference);

  const allApproved = idFrontDoc?.status === 'approved' && idBackDoc?.status === 'approved' && selfieDoc?.status === 'approved';
  const anyRejected = [idFrontDoc, idBackDoc, selfieDoc].some(d => d?.status === 'rejected');
  const attemptCount = user?.docupass_attempt_count || 0;
  const isLocked = attemptCount >= 3 && anyRejected;

  // Detect return from DocuPass (mobile new tab)
  useEffect(() => {
    if (!sessionActive) return;

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        setSessionActive(false);
        handleReturn();
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handleVisibility);
    };
  }, [sessionActive]);

  // Polling effect
  useEffect(() => {
    if (!polling) return;

    let attempts = 0;
    const maxAttempts = 6; // 6 x 5s = 30s

    const doPoll = async () => {
      attempts++;
      await onDataChange();
      if (attempts >= maxAttempts) {
        setPolling(false);
      }
    };

    pollTimerRef.current = setInterval(doPoll, 5000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [polling]);

  // Stop polling when approved
  useEffect(() => {
    if (allApproved && polling) {
      setPolling(false);
    }
  }, [allApproved, polling]);

  async function handleReturn() {
    await onDataChange();
    setPolling(true);
  }

  function handleCloseOverlay() {
    setShowOverlay(false);
    handleReturn();
  }

  async function handleStart() {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('createDocupassSession', {
        redirectUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      });
      if (res.data?.url) {
        sessionStorage.setItem('docupass_just_started', 'true');
        setDocupassUrl(res.data.url);
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        if (isMobile) {
          setSessionActive(true);
          window.open(res.data.url, '_blank', 'noopener');
        } else {
          setShowOverlay(true);
        }
      } else {
        setError(res.data?.error || 'Failed to start verification. Try again.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to start verification. Try again.');
    }
    setLoading(false);
  }

  // === SUCCESS STATE ===
  if (allApproved) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="bg-muted text-foreground rounded-xl py-2.5 px-4 text-sm font-semibold flex items-center gap-1.5 w-full justify-center">
          <ChevronLeft className="w-4 h-4" /> Back to tasks
        </button>

        <div className="bg-success/5 border border-success/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-success" />
            </div>
            <p className="text-sm font-bold text-success">Identity Verified</p>
          </div>

          {(user?.id_extracted_name || user?.id_extracted_dob || user?.national_id) && (
            <div className="space-y-2 mt-3 pt-3 border-t border-success/10">
              {user?.id_extracted_name && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Full Name</span>
                  <span className="font-medium">{user.id_extracted_name}</span>
                </div>
              )}
              {user?.id_extracted_dob && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Date of Birth</span>
                  <span className="font-medium">{user.id_extracted_dob}</span>
                </div>
              )}
              {user?.national_id && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">National ID</span>
                  <span className="font-medium font-mono">{user.national_id}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === MAIN STATE ===
  return (
    <div className="space-y-4">
      {showOverlay && docupassUrl && (
        <DocupassOverlay url={docupassUrl} onClose={handleCloseOverlay} />
      )}

      <button onClick={onBack} className="bg-muted text-foreground rounded-xl py-2.5 px-4 text-sm font-semibold flex items-center gap-1.5 w-full justify-center">
        <ChevronLeft className="w-4 h-4" /> Back to tasks
      </button>

      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-sm">Identity Verification</h3>
          <p className="text-[10px] text-muted-foreground">Secure KYC powered by IDAnalyzer</p>
        </div>
      </div>

      {/* 3-step explainer */}
      <div className="space-y-2">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <step.icon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">{i + 1}. {step.title}</p>
              <p className="text-[10px] text-muted-foreground">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Polling state */}
      {polling && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 animate-pulse flex-shrink-0" />
          <p className="text-xs text-blue-700 font-medium">Processing your verification…</p>
        </div>
      )}

      {/* Rejected state */}
      {anyRejected && !polling && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-destructive font-medium">Verification failed. Please try again.</p>
            {idFrontDoc?.rejection_reason && (
              <p className="text-[10px] text-destructive/70 mt-0.5">{idFrontDoc.rejection_reason}</p>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* CTA */}
      {!polling && !isLocked && (
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50 animate-pulse-glow"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting to secure verification…</>
            : anyRejected
              ? <><ShieldCheck className="w-4 h-4" /> Try Again</>
              : <><ShieldCheck className="w-4 h-4" /> Start Secure Verification</>}
        </button>
      )}
      {isLocked && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-center space-y-3">
          <p className="text-xs text-destructive font-medium">Maximum verification attempts reached</p>
          <button
            onClick={() => navigate('/app/support')}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm"
          >
            <LifeBuoy className="w-4 h-4" /> Contact Support
          </button>
        </div>
      )}

      <p className="text-center text-[10px] text-muted-foreground">
        Powered by IDAnalyzer · Bank-grade security
      </p>
    </div>
  );
}
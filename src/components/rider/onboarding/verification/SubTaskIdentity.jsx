import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CreditCard, FileText, User, ChevronLeft, Check, AlertTriangle, Loader2, ShieldCheck, Clock, LifeBuoy } from 'lucide-react';
import DocupassOverlay from './DocupassOverlay';
import DocupassResultScreen from '../DocupassResultScreen';

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
  const [showOutcome, setShowOutcome] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  const pollTimerRef = useRef(null);
  const latestUserRef = useRef(user); // H2 fix: track latest user to avoid stale closure

  // Update latestUserRef whenever user changes
  useEffect(() => {
    latestUserRef.current = user;
  }, [user]);

  // Only consider IDAnalyzer-processed docs (with provider_reference)
  const idFrontDoc = kycDocs.find(d => d.document_type === 'id_front' && d.provider_reference);
  const idBackDoc = kycDocs.find(d => d.document_type === 'id_back' && d.provider_reference);
  const selfieDoc = kycDocs.find(d => d.document_type === 'selfie' && d.provider_reference);

  const allApproved = idFrontDoc?.status === 'approved' && idBackDoc?.status === 'approved' && selfieDoc?.status === 'approved';
  const anyRejected = [idFrontDoc, idBackDoc, selfieDoc].some(d => d?.status === 'rejected');
  const attemptCount = user?.docupass_attempt_count || 0;
  const isLocked = attemptCount >= 3 && anyRejected;

  // Detect return from DocuPass (mobile new tab) — M2 fix: deduplicate polling trigger
  useEffect(() => {
    if (!sessionActive) return;

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        setSessionActive(false);
        if (!polling) handleReturn(); // M2: only trigger if not already polling
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handleVisibility);
    };
  }, [sessionActive, polling]);

  // Polling effect — start with 3s delay, then poll every 5s for up to 5 min (review state)
  useEffect(() => {
    if (!polling) return;

    let mounted = true;
    const maxAttempts = 60; // 5 minutes (3s initial + 60x5s polling)

    const startPolling = async () => {
      // Wait 3s to allow webhook processing
      await new Promise(r => setTimeout(r, 3000));
      if (!mounted) return;

      for (let i = 0; i < maxAttempts; i++) {
        if (!mounted) break;
        await onDataChange();
        setPollAttempts(i + 1);
        
        // Stop if decision is now available (webhook fired) — use ref to get latest user
        if (latestUserRef.current?.docupass_decision) break;
        
        // Wait 5s before next poll
        if (i < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, 5000));
        }
      }
      
      if (mounted) {
        setPolling(false);
        setPollAttempts(0);
      }
    };

    startPolling();

    return () => {
      mounted = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [polling, onDataChange]);

  // Stop polling early if decision is available
  useEffect(() => {
    if (polling && (user?.docupass_decision || allApproved)) {
      setPolling(false);
      setShowOutcome(true);
    }
  }, [user?.docupass_decision, allApproved, polling]);

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
      const res = await base44.functions.invoke('createDocupassSession', {});
      if (res.data?.url) {
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
      setError(e.response?.data?.error || e.message || 'Failed to start verification. Please check your connection and try again.');
    }
    setLoading(false);
  }

  function handleOutcomeDismiss() {
    setShowOutcome(false);
    // Reset for retry
    setError('');
    setPollAttempts(0);
  }

  // === OUTCOME STATE (via DocupassResultScreen) ===
  if (showOutcome && user?.docupass_decision) {
    return (
      <DocupassResultScreen
        decision={user.docupass_decision}
        user={user}
        kycDocs={kycDocs}
        attemptCount={user.docupass_attempt_count || 0}
        onDismiss={handleOutcomeDismiss}
        onGoToDashboard={() => navigate('/app')}
        onContactSupport={() => navigate('/app/support')}
        onRefresh={onDataChange}
      />
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
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-amber-700 font-medium">Under Review</p>
            <p className="text-[10px] text-amber-600">We're verifying your identity. This usually takes a few minutes.</p>
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
      {!polling && !showOutcome && (
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50 animate-pulse-glow"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting to secure verification…</>
            : anyRejected && !isLocked
              ? <><ShieldCheck className="w-4 h-4" /> Try Again</>
              : <><ShieldCheck className="w-4 h-4" /> Start Secure Verification</>}
        </button>
      )}
      {isLocked && !showOutcome && (
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
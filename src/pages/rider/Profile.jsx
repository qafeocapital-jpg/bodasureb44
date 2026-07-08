import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ChevronLeft } from 'lucide-react';
import { getOnboardingPhase } from '@/lib/onboarding';
import { normalizePhone } from '@/lib/phone';
import PageSkeleton from '@/components/rider/PageSkeleton';
import ProgressBar from '@/components/rider/onboarding/ProgressBar';
import PhasePersonal from '@/components/rider/onboarding/PhasePersonal';
import PhaseBike from '@/components/rider/onboarding/PhaseBike';
import PhaseMapBike from '@/components/rider/onboarding/PhaseMapBike';
import PhaseSacco from '@/components/rider/onboarding/PhaseSacco';
import SubTaskIdentity from '@/components/rider/onboarding/verification/SubTaskIdentity';
import SubTaskBikePhotos from '@/components/rider/onboarding/verification/SubTaskBikePhotos';
import SubTaskOwner from '@/components/rider/onboarding/verification/SubTaskOwner';
import CompletionScreen from '@/components/rider/onboarding/CompletionScreen';
import { getOrCreateWallet } from '@/lib/payments';
import KycTierStatus from '@/components/rider/KycTierStatus';
import DocupassResultScreen from '@/components/rider/onboarding/DocupassResultScreen';
import ProfileSummaryCard from '@/components/rider/onboarding/ProfileSummaryCard';

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const [counties, setCounties] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [completedPhase, setCompletedPhase] = useState(0);
  const [draftData, setDraftData] = useState({});
  const [readOnly, setReadOnly] = useState(false);
  const [kycDocs, setKycDocs] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [showDocupassResult, setShowDocupassResult] = useState(false);
  const [docupassOutcome, setDocupassOutcome] = useState(null);
  const [verificationTask, setVerificationTask] = useState(null);
  const [group, setGroup] = useState(null);

  // Re-fetch all data when admin resets KYC (session_invalidated_at changes)
  useEffect(() => {
    if (user?.session_invalidated_at) setHasInitialized(false);
  }, [user?.session_invalidated_at]);

  // Handle direct verification task navigation from Home grid
  useEffect(() => {
    const task = location.state?.targetVerificationTask;
    if (task) {
      setVerificationTask(task);
    } else {
      setVerificationTask(null);
    }
  }, [location.state?.targetVerificationTask]);

  useEffect(() => {
    async function load() {
      if (!user?.id || hasInitialized) return;
      try {
        const [cs, vs, gms, kd, w] = await Promise.all([
          base44.entities.County.filter({}),
          base44.entities.Vehicle.filter({ rider_id: user.id }, '-created_date'),
          base44.entities.GroupMember.filter({ user_id: user.id }),
          base44.entities.KycDocument.filter({ user_id: user.id }),
          getOrCreateWallet(user.id),
        ]);
        setCounties(cs);
        setVehicles(vs);
        setGroupMembers(gms);
        setKycDocs(kd);
        setWallet(w);

        // Fetch group if user is a member
        if (gms.length > 0 && gms[0].group_id) {
          try {
            const grp = await base44.entities.Group.get(gms[0].group_id);
            setGroup(grp);
          } catch (e) {}
        }

        // Issue 5a: Legacy doc auto-purge (silent, non-blocking)
        const legacyDocs = kd.filter(d =>
          !d.provider_reference &&
          d.provider_name !== 'idanalyzer_docupass' &&
          ['id_front', 'id_back', 'selfie'].includes(d.document_type)
        );
        if (legacyDocs.length > 0) {
          Promise.allSettled(legacyDocs.map(d => base44.entities.KycDocument.delete(d.id)))
            .then(() => {
              setKycDocs(prev => prev.filter(d => !legacyDocs.find(ld => ld.id === d.id)));
            })
            .catch(() => {});
        }

        // Issue 1: DocuPass result detection
        const idDocTypes = ['id_front', 'id_back', 'selfie'];
        const processedIdDocs = kd.filter(d => idDocTypes.includes(d.document_type) && d.provider_reference);
        const allThreeProcessed = idDocTypes.every(type => processedIdDocs.some(d => d.document_type === type));
        if (allThreeProcessed && sessionStorage.getItem('docupass_just_started') === 'true') {
          sessionStorage.removeItem('docupass_just_started');
          const allApproved = idDocTypes.every(type =>
            processedIdDocs.find(d => d.document_type === type)?.status === 'approved'
          );
          const anyRejected = processedIdDocs.some(d => d.status === 'rejected');
          if (allApproved) setDocupassOutcome('accepted');
          else if (anyRejected) setDocupassOutcome('rejected');
          else setDocupassOutcome('review');
          setShowDocupassResult(true);
        }

        // Issue 4: Smart phase routing using independent phase evaluation
        const phase = getOnboardingPhase(user, vs, gms, w);
        setCompletedPhase(phase);
        const targetPhase = location.state?.targetPhase;
        const viewStep = location.state?.viewStep;
        const targetVerificationTask = location.state?.targetVerificationTask;

        if (targetVerificationTask) {
          setVerificationTask(targetVerificationTask);
        } else if (targetPhase !== undefined && targetPhase !== null) {
          setCurrentPhase(targetPhase);
          setReadOnly(false);
        } else if (viewStep !== undefined && viewStep !== null && user?.onboarding_complete) {
          setCurrentPhase(viewStep);
          setReadOnly(true);
        } else {
          setCurrentPhase(Math.min(phase, 4));
          setReadOnly(false);
        }
      } catch (e) {}
      setHasInitialized(true);
      setLoading(false);
    }
    load();
  }, [user?.id, hasInitialized]);

  async function refreshData() {
    if (refreshUser) await refreshUser();
    try {
      const [vs, gms, kd] = await Promise.all([
        base44.entities.Vehicle.filter({ rider_id: user.id }, '-created_date'),
        base44.entities.GroupMember.filter({ user_id: user.id }),
        base44.entities.KycDocument.filter({ user_id: user.id }),
      ]);
      setVehicles(vs);
      setGroupMembers(gms);
      setKycDocs(kd);
    } catch (e) {}
  }

  async function handlePhaseComplete() {
    await refreshData();
    setCurrentPhase(p => Math.min(p + 1, 4));
    setCompletedPhase(p => Math.min(p + 1, 4));
  }

  const phaseInitialValues = (phase) => {
    const draft = draftData[phase] || {};
    if (phase === 0) {
      return {
        full_name: draft.full_name || user?.full_name || '',
        phone: draft.phone || normalizePhone(user?.phone) || user?.phone || '',
        national_id: draft.national_id || user?.national_id || '',
        county_id: draft.county_id || user?.county_id || '',
      };
    }
    if (phase === 1) {
      const v = vehicles[0];
      return {
        plate_number: v?.plate_number || draft.plate_number || '',
        make: v?.make || draft.make || '',
        color: v?.color || draft.color || '',
        role: draft.role || (v?.owner_id === user.id ? (v.rider_id === user.id ? 'owner_rider' : 'owner') : 'rider'),
        is_owner_rider: draft.is_owner_rider ?? (v?.is_owner_rider ?? true),
        owner_phone: draft.owner_phone || v?.owner_phone || '',
      };
    }
    if (phase === 2) {
      const v = vehicles[0];
      return {
        sub_county_id: v?.sub_county_id || draft.sub_county_id || '',
        ward_id: v?.ward_id || draft.ward_id || '',
      };
    }
    return draft;
  };

  const handleDraftChange = (phase, partial) => {
    setDraftData(prev => ({ ...prev, [phase]: { ...(prev[phase] || {}), ...partial } }));
  };

  const handleExitReadOnly = () => {
    setReadOnly(false);
    const phase = getOnboardingPhase(user, vehicles, groupMembers, wallet);
    setCompletedPhase(phase);
    setCurrentPhase(Math.min(phase, 4));
    navigate('/app/profile', { replace: true, state: {} });
  };

  if (loading || !user) return <PageSkeleton variant="default" />;

  // Direct verification sub-task rendering (from Home grid tile tap)
  if (verificationTask) {
    const vehicle = vehicles[0];
    return (
      <div className="p-5 animate-fade-in">
        {verificationTask === 'identity' && (
          <SubTaskIdentity user={user} kycDocs={kycDocs} onDataChange={refreshData} onBack={() => navigate('/app')} />
        )}
        {verificationTask === 'bike' && (
          <SubTaskBikePhotos user={user} vehicle={vehicle} kycDocs={kycDocs} onDataChange={refreshData} onBack={() => navigate('/app')} />
        )}
        {verificationTask === 'owner' && (
          <SubTaskOwner user={user} vehicle={vehicle} onDataChange={refreshData} onBack={() => navigate('/app')} />
        )}
      </div>
    );
  }

  // Issue 1: DocuPass result screen
  if (showDocupassResult) {
    return (
      <DocupassResultScreen
        outcome={docupassOutcome}
        user={user}
        kycDocs={kycDocs}
        attemptCount={user.docupass_attempt_count || 0}
        onDismiss={() => { setShowDocupassResult(false); setDocupassOutcome(null); }}
        onGoToDashboard={() => { setShowDocupassResult(false); setDocupassOutcome(null); navigate('/app'); }}
        onContactSupport={() => { setShowDocupassResult(false); setDocupassOutcome(null); navigate('/app/support'); }}
        onRefresh={refreshData}
      />
    );
  }

  // Issue 2: Completed profile summary card
  if (user.onboarding_complete && user.verification_complete) {
    const county = counties.find(c => c.id === user.county_id);
    return (
      <ProfileSummaryCard
        user={user}
        vehicle={vehicles[0]}
        group={group}
        county={county}
        wallet={wallet}
        onBack={() => navigate('/app')}
        onContactSupport={() => navigate('/app/support')}
      />
    );
  }

  return (
    <div className="p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate('/app')} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">Set Up Your Account</h1>
      </div>

      {/* KYC Tier Status */}
      {!readOnly && (
        <div className="mt-6">
          <KycTierStatus
            user={user}
            vehicle={vehicles[0]}
            kycDocs={kycDocs}
            groupMember={groupMembers[0]}
          />
        </div>
      )}

      {/* Progress Bar */}
      <ProgressBar currentPhase={currentPhase} completedPhase={completedPhase} onJumpBack={(p) => { setReadOnly(!!user?.onboarding_complete); setCurrentPhase(p); }} onboardingComplete={user?.onboarding_complete} />

      {/* Phase Content */}
      <div className="mt-6">
        {currentPhase === 0 && (
          <PhasePersonal
            user={user}
            counties={counties}
            initialValues={phaseInitialValues(0)}
            onDraftChange={(partial) => handleDraftChange(0, partial)}
            onSaved={handlePhaseComplete}
            onBack={() => navigate('/app')}
            readOnly={readOnly}
            onExitReadOnly={handleExitReadOnly}
          />
        )}
        {currentPhase === 1 && (
          <PhaseBike
            user={user}
            counties={counties}
            vehicle={vehicles[0]}
            initialValues={phaseInitialValues(1)}
            onDraftChange={(partial) => handleDraftChange(1, partial)}
            onSaved={handlePhaseComplete}
            onBack={() => setCurrentPhase(0)}
            readOnly={readOnly}
            onExitReadOnly={handleExitReadOnly}
          />
        )}
        {currentPhase === 2 && (
          <PhaseMapBike
            user={user}
            vehicle={vehicles[0]}
            initialValues={phaseInitialValues(2)}
            onDraftChange={(partial) => handleDraftChange(2, partial)}
            onSaved={handlePhaseComplete}
            onBack={() => setCurrentPhase(1)}
            readOnly={readOnly}
            onExitReadOnly={handleExitReadOnly}
          />
        )}
        {currentPhase === 3 && (
          <PhaseSacco
            user={user}
            counties={counties}
            groupMembers={groupMembers}
            vehicle={vehicles[0]}
            onJoined={handlePhaseComplete}
            onBack={() => setCurrentPhase(2)}
            readOnly={readOnly}
            onExitReadOnly={handleExitReadOnly}
          />
        )}
        {currentPhase >= 4 && (
          <CompletionScreen onDone={() => navigate('/app')} verificationComplete={user?.verification_complete} user={user} />
        )}
      </div>
    </div>
  );
}
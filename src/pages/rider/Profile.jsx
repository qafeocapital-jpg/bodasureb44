import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import PhaseStage from '@/components/rider/onboarding/PhaseStage';
import PhaseSacco from '@/components/rider/onboarding/PhaseSacco';
import PhaseVerification from '@/components/rider/onboarding/PhaseVerification';
import CompletionScreen from '@/components/rider/onboarding/CompletionScreen';

export default function Profile() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [counties, setCounties] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [draftData, setDraftData] = useState({});

  useEffect(() => {
    async function load() {
      if (!user || hasInitialized) return;
      try {
        const [cs, vs, gms] = await Promise.all([
          base44.entities.County.filter({}),
          base44.entities.Vehicle.filter({ rider_id: user.id }, '-created_date'),
          base44.entities.GroupMember.filter({ user_id: user.id }),
        ]);
        setCounties(cs);
        setVehicles(vs);
        setGroupMembers(gms);
        const phase = getOnboardingPhase(user, vs, gms);
        setCurrentPhase(Math.min(phase, 6));
      } catch (e) {}
      setHasInitialized(true);
      setLoading(false);
    }
    load();
  }, [user, hasInitialized]);

  async function refreshData() {
    if (refreshUser) await refreshUser();
    try {
      const [vs, gms] = await Promise.all([
        base44.entities.Vehicle.filter({ rider_id: user.id }, '-created_date'),
        base44.entities.GroupMember.filter({ user_id: user.id }),
      ]);
      setVehicles(vs);
      setGroupMembers(gms);
    } catch (e) {}
  }

  async function handlePhaseComplete() {
    await refreshData();
    setCurrentPhase(p => Math.min(p + 1, 6));
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
        year: v?.year?.toString() || draft.year || '',
        role: draft.role || 'rider',
        is_owner_rider: draft.is_owner_rider ?? (v?.is_owner_rider ?? true),
        owner_phone: draft.owner_phone || '',
      };
    }
    if (phase === 2) {
      const v = vehicles[0];
      return {
        sub_county_id: v?.sub_county_id || draft.sub_county_id || '',
        ward_id: v?.ward_id || draft.ward_id || '',
        stage_id: v?.stage_id || draft.stage_id || '',
      };
    }
    return draft;
  };

  const handleDraftChange = (phase, partial) => {
    setDraftData(prev => ({ ...prev, [phase]: { ...(prev[phase] || {}), ...partial } }));
  };

  if (loading || !user) return <PageSkeleton variant="default" />;

  return (
    <div className="p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate('/app')} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">Set Up Your Account</h1>
      </div>

      {/* Progress Bar */}
      <ProgressBar currentPhase={currentPhase} onJumpBack={(p) => setCurrentPhase(p)} onboardingComplete={user?.onboarding_complete} />

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
          />
        )}
        {currentPhase === 3 && (
          <PhaseStage
            user={user}
            vehicle={vehicles[0]}
            onSaved={handlePhaseComplete}
            onBack={() => setCurrentPhase(2)}
          />
        )}
        {currentPhase === 4 && (
          <PhaseSacco
            user={user}
            counties={counties}
            groupMembers={groupMembers}
            vehicle={vehicles[0]}
            onJoined={handlePhaseComplete}
            onBack={() => setCurrentPhase(3)}
          />
        )}
        {currentPhase === 5 && (
          <PhaseVerification
            user={user}
            vehicle={vehicles[0]}
            onCompleted={() => setCurrentPhase(6)}
            onBack={() => setCurrentPhase(4)}
          />
        )}
        {currentPhase >= 6 && (
          <CompletionScreen onDone={() => navigate('/app')} verificationComplete={user?.verification_complete} />
        )}
      </div>
    </div>
  );
}
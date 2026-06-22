import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ChevronLeft } from 'lucide-react';
import { getOnboardingPhase } from '@/lib/onboarding';
import PageSkeleton from '@/components/rider/PageSkeleton';
import ProgressBar from '@/components/rider/onboarding/ProgressBar';
import PhasePersonal from '@/components/rider/onboarding/PhasePersonal';
import PhaseBike from '@/components/rider/onboarding/PhaseBike';
import PhaseMapBike from '@/components/rider/onboarding/PhaseMapBike';
import PhaseStage from '@/components/rider/onboarding/PhaseStage';
import PhaseSacco from '@/components/rider/onboarding/PhaseSacco';
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
        setCurrentPhase(Math.min(phase, 5));
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
    setCurrentPhase(p => Math.min(p + 1, 5));
  }

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
      <ProgressBar currentPhase={currentPhase} onJumpBack={(p) => setCurrentPhase(p)} />

      {/* Phase Content */}
      <div className="mt-6">
        {currentPhase === 0 && (
          <PhasePersonal
            user={user}
            counties={counties}
            onSaved={handlePhaseComplete}
            onBack={() => navigate('/app')}
          />
        )}
        {currentPhase === 1 && (
          <PhaseBike
            user={user}
            counties={counties}
            onSaved={handlePhaseComplete}
            onBack={() => setCurrentPhase(0)}
          />
        )}
        {currentPhase === 2 && (
          <PhaseMapBike
            user={user}
            vehicle={vehicles[0]}
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
            onJoined={handlePhaseComplete}
            onBack={() => setCurrentPhase(3)}
          />
        )}
        {currentPhase >= 5 && (
          <CompletionScreen onDone={() => navigate('/app')} />
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOnboardingPhase } from '@/lib/onboarding';
import WizardIntroScreen from './WizardIntroScreen';
import WizardStepOverview from './WizardStepOverview';

export default function OnboardingWizardModal({ open, onClose, user, bikes, groupMembers, wallet, startScreen = 0 }) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(startScreen);

  useEffect(() => {
    if (open) setScreen(startScreen);
  }, [open, startScreen]);

  if (!open) return null;

  const phase = getOnboardingPhase(user, bikes, groupMembers, wallet);
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  const handleNavigate = (path, state) => {
    onClose();
    navigate(path, state ? { state } : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[90dvh] bg-card rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up flex flex-col">
        {screen === 0 ? (
          <WizardIntroScreen phase={phase} firstName={firstName} onBegin={() => setScreen(1)} onClose={onClose} />
        ) : (
          <WizardStepOverview phase={phase} onNavigate={handleNavigate} onClose={onClose} />
        )}
      </div>
    </div>
  );
}
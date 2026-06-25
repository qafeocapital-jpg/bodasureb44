// PhasePersonal orchestrator: holds step state + form data, delegates rendering to step components
import { useState } from 'react';
import { splitFullName, joinFullName } from '@/lib/nameUtils';
import { Shield, KeyRound, Check, Smartphone } from 'lucide-react';
import { ReadOnlyBanner, ReadOnlyBackButton } from '@/components/rider/onboarding/ReadOnlyBanner';
import PhasePersonalForm from '@/components/rider/onboarding/PhasePersonalForm';
import PhasePersonalOtp from '@/components/rider/onboarding/PhasePersonalOtp';
import PhasePersonalPin from '@/components/rider/onboarding/PhasePersonalPin';
import PhasePersonalSuccess from '@/components/rider/onboarding/PhasePersonalSuccess';

const STEPS = [
  { title: 'Details', icon: Smartphone },
  { title: 'Verify OTP', icon: Shield },
  { title: 'Set PIN', icon: KeyRound },
  { title: 'Done', icon: Check },
];

export default function PhasePersonal({ user, counties, initialValues, onDraftChange, onSaved, onBack, readOnly, onExitReadOnly }) {
  const [step, setStep] = useState(0);
  const [requestId, setRequestId] = useState('');

  const nameParts = splitFullName(initialValues?.full_name || user?.full_name || '');
  const [form, setForm] = useState({
    full_name: initialValues?.full_name || '',
    firstName: nameParts.firstName,
    middleName: nameParts.middleName,
    lastName: nameParts.lastName,
    phone: initialValues?.phone || '',
    national_id: initialValues?.national_id || '',
    county_id: initialValues?.county_id || '',
  });

  if (readOnly) {
    return (
      <div className="space-y-4">
        <ReadOnlyBanner />
        <div className="space-y-4 opacity-60 pointer-events-none">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="font-medium">{form.firstName} {form.lastName}</p>
            <p className="text-sm text-muted-foreground">{form.phone}</p>
          </div>
        </div>
        <ReadOnlyBackButton onExit={onExitReadOnly} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-1">Step {step + 1} of {STEPS.length}</p>
      <h2 className="font-heading font-bold text-lg mb-5">{STEPS[step].title}</h2>

      {step === 0 && (
        <PhasePersonalForm
          user={user}
          counties={counties}
          form={form}
          setForm={setForm}
          onDraftChange={onDraftChange}
          onWalletInitiated={(reqId) => {
            if (reqId) {
              setRequestId(reqId);
              setStep(1);
            } else {
              setStep(2); // recovered — skip OTP
            }
          }}
          onBack={onBack}
        />
      )}

      {step === 1 && (
        <PhasePersonalOtp
          requestId={requestId}
          onRequestIdUpdated={(newId) => setRequestId(newId)}
          onOtpConfirmed={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && (
        <PhasePersonalPin onPinSet={() => setStep(3)} />
      )}

      {step === 3 && (
        <PhasePersonalSuccess onComplete={onSaved} />
      )}
    </div>
  );
}
import { Check, ChevronRight, Clock, AlertTriangle, Shield } from 'lucide-react';
import { ONBOARDING_PHASES } from '@/lib/onboarding';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function CompletionScreen({ onDone, verificationComplete, user }) {
  const [accountState, setAccountState] = useState(user?.account_state || 'DRAFT');
  const [permitExpiry, setPermitExpiry] = useState(null);

  useEffect(() => {
    async function fetchPermit() {
      if (!user?.id) return;
      try {
        const permits = await base44.entities.Permit.filter({ rider_id: user.id, status: 'active' }, '-created_date', 1);
        if (permits.length > 0 && permits[0].permit_type === 'provisional' && permits[0].end_date) {
          setPermitExpiry(new Date(permits[0].end_date));
        }
      } catch (e) {}
    }
    fetchPermit();
  }, [user?.id]);

  const isBasicActive = accountState === 'BASIC_ACTIVE';
  const isVerified = accountState === 'VERIFIED' || verificationComplete;
  const daysUntilExpiry = permitExpiry ? Math.ceil((permitExpiry - new Date()) / (1000 * 60 * 60 * 24)) : null;

  if (isVerified) {
    return (
      <div className="text-center py-6 animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5">
          <Check className="w-12 h-12 text-success" strokeWidth={3} />
        </div>
        <h2 className="font-heading font-bold text-xl mb-2">You're All Set! 🎉</h2>
        <p className="text-sm text-muted-foreground mb-6">Your account is fully verified and ready to go.</p>

        <div className="space-y-2 mb-8 text-left">
          {ONBOARDING_PHASES.map(phase => (
            <div key={phase.id} className="flex items-center gap-3 bg-card border border-success/20 rounded-xl px-4 py-2.5">
              <div className="w-7 h-7 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-success" strokeWidth={3} />
              </div>
              <div>
                <p className="text-sm font-medium">{phase.name}</p>
                <p className="text-[10px] text-success">Complete</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onDone}
          className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm"
        >
          Go to Dashboard <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (isBasicActive) {
    return (
      <div className="text-center py-6 animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
          <Shield className="w-12 h-12 text-blue-600" strokeWidth={2} />
        </div>
        <h2 className="font-heading font-bold text-xl mb-2">Basic Active — Provisional Permit Issued</h2>
        <p className="text-sm text-muted-foreground mb-6">You can now collect fares. Complete verification within 14 days to keep your permit valid.</p>

        {daysUntilExpiry !== null && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">Permit Expiry Countdown</p>
            </div>
            <p className="text-2xl font-heading font-bold text-amber-700">{daysUntilExpiry} days remaining</p>
            <p className="text-xs text-amber-600 mt-1">Complete identity verification to unlock full features</p>
          </div>
        )}

        <button
          onClick={onDone}
          className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm mb-3"
        >
          Start Verification <ChevronRight className="w-4 h-4" />
        </button>
        <p className="text-xs text-muted-foreground">Your provisional permit is active and scannable by enforcement</p>
      </div>
    );
  }

  // Onboarding complete but not yet verified or basic_active
  return (
    <div className="text-center py-6 animate-fade-in">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
        <Check className="w-12 h-12 text-primary" strokeWidth={3} />
      </div>
      <h2 className="font-heading font-bold text-xl mb-2">Setup Complete!</h2>
      <p className="text-sm text-muted-foreground mb-6">
        You've completed all setup steps. Complete identity verification from your dashboard to unlock all features.
      </p>
      <button
        onClick={onDone}
        className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm"
      >
        Go to Dashboard <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
import { Lock, LifeBuoy, ChevronLeft, ShieldCheck, CreditCard, Bike, Users } from 'lucide-react';
import { getVerificationLevel, VERIFICATION_LEVEL_CONFIG } from '@/lib/verification';

/**
 * Read-only profile summary card shown when onboarding_complete && verification_complete.
 */
export default function ProfileSummaryCard({ user, vehicle, group, county, wallet, onBack, onContactSupport }) {
  const level = getVerificationLevel(user);
  const levelConfig = VERIFICATION_LEVEL_CONFIG[level] || VERIFICATION_LEVEL_CONFIG.unverified;

  return (
    <div className="p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onBack} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">My Profile</h1>
        <Lock className="w-4 h-4 text-muted-foreground ml-1" />
      </div>

      {/* KYC Tier Badge */}
      <div className="flex justify-center mb-6">
        <div className={`px-4 py-2 rounded-full text-sm font-semibold ${levelConfig.className}`}>
          {levelConfig.label}
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {/* Personal */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personal</h3>
          </div>
          <Field label="Full Name" value={user?.full_name} />
          <Field label="National ID" value={user?.national_id} mono />
          <Field label="Phone" value={user?.phone} />
          <Field label="County" value={county?.name} />
        </div>

        {/* Bike */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Bike className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bike</h3>
          </div>
          {vehicle ? (
            <>
              <Field label="Plate Number" value={vehicle.plate_number} mono />
              <Field label="Make" value={vehicle.make} />
              <Field label="Color" value={vehicle.color} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No bike registered</p>
          )}
        </div>

        {/* SACCO */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SACCO</h3>
          </div>
          <Field label="SACCO Name" value={group?.name || 'Not joined'} />
        </div>

        {/* Verification */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Verification</h3>
          </div>
          <Field label="Status" value={user?.verification_complete ? 'Verified' : 'Pending'} />
          <Field label="KYC Level" value={user?.kyc_status || 'Unverified'} />
        </div>
      </div>

      {/* Contact Support */}
      <button
        onClick={onContactSupport}
        className="w-full mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-3"
      >
        <LifeBuoy className="w-4 h-4" /> Need to change something? Contact Support
      </button>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}
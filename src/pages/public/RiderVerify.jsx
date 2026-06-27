import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import { AlertCircle, MapPin, Users, ShieldCheck } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';
import { useAuth } from '@/lib/AuthContext';

/**
 * Public rider verification page — shows COMPLIANCE STATUS ONLY.
 * No PII (name, national ID, phone) is exposed to unauthenticated viewers.
 * Only plate number, county/stage, SACCO name, and permit/insurance status.
 */
const getComplianceTier = (verificationComplete, bikeApproved, permitActive, insuranceActive, hasGroup) => {
  if (verificationComplete && bikeApproved && permitActive && insuranceActive) return { tier: 'Fully Verified', color: 'bg-success', textColor: 'text-success' };
  if (bikeApproved && permitActive) return { tier: 'Road-Ready', color: 'bg-chart-1', textColor: 'text-chart-1' };
  if (bikeApproved) return { tier: 'Partial', color: 'bg-warning', textColor: 'text-warning' };
  return { tier: 'Non-Compliant', color: 'bg-destructive', textColor: 'text-destructive' };
};

export default function RiderVerify() {
  const { riderId } = useParams();
  const { isLoadingAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [rider, setRider] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [permit, setPermit] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [group, setGroup] = useState(null);
  const [county, setCounty] = useState(null);
  const [stage, setStage] = useState(null);
  const [verifyTime] = useState(new Date().toLocaleString('en-KE'));

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!riderId) return;

    async function load() {
      try {
        // Use backend function — returns ONLY compliance-relevant fields, no PII
        const res = await base44.functions.invoke('getPublicRiderVerification', { riderId });
        const data = res.data;
        if (data?.error === 'Rider not found') {
          setNotFound(true);
          setLoading(false);
          return;
        }
        if (data?.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        setRider({ verification_complete: data.verification_complete });
        setVehicle(data.bike);
        setPermit(data.permit);
        setPolicy(data.policy);
        setCounty(data.county);
        setStage(data.stage);
        setGroup(data.group);
      } catch (e) {
        setError(e.response?.data?.error || e.message || 'Failed to load verification data');
      }
      setLoading(false);
    }
    load();
  }, [riderId, isLoadingAuth]);

  if (loading) return <PageSkeleton variant="hero-rows" />;

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground mb-1">Rider Not Found</h2>
          <p className="text-sm text-muted-foreground">This rider profile could not be loaded.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground mb-1">Error</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const permitDaysRemaining = permit ? Math.max(-1, Math.floor((new Date(permit.end_date) - new Date()) / (1000 * 60 * 60 * 24))) : null;
  const insuranceDaysRemaining = policy ? Math.max(-1, Math.floor((new Date(policy.end_date) - new Date()) / (1000 * 60 * 60 * 24))) : null;

  const isVerified = rider?.verification_complete;
  const bikeApproved = vehicle?.status === 'approved';
  const permitActive = permit && permitDaysRemaining >= 0;
  const insuranceActive = policy && insuranceDaysRemaining >= 0;
  const compliance = getComplianceTier(isVerified, bikeApproved, permitActive, insuranceActive, !!group);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-transparent p-6 text-center border-b border-border">
        <div className="text-sm font-bold text-primary mb-2">BODASURE</div>
        <h1 className="text-xl font-heading font-bold text-foreground">Rider Verification</h1>
      </div>

      {/* Content — NO PII exposed (no name, no national ID, no phone) */}
      <div className="max-w-sm mx-auto p-5 space-y-4">
        {/* Shield icon instead of selfie */}
        <div className="flex justify-center mb-2">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Compliance Tier Badge */}
        <div className={`${compliance.color}/10 border border-${compliance.color}/30 rounded-xl p-3 text-center`}>
          <p className={`text-sm font-bold ${compliance.textColor} uppercase tracking-wide`}>{compliance.tier}</p>
        </div>

        {/* Details Card */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          {/* Plate */}
          {vehicle?.plate_number && (
            <div className="pb-3 border-b border-border">
              <p className="text-xs text-muted-foreground font-semibold mb-1">LICENSE PLATE</p>
              <p className="text-sm font-semibold font-mono bg-muted px-2 py-1 rounded text-center">{vehicle.plate_number}</p>
            </div>
          )}

          {/* Location */}
          {county || stage ? (
            <div className="pb-3 border-b border-border">
              <div className="flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-semibold">LOCATION</p>
              </div>
              <div className="text-sm space-y-0.5">
                {county && <p className="font-medium text-foreground">{county.name}</p>}
                {stage && <p className="text-xs text-muted-foreground">{stage.name}</p>}
              </div>
            </div>
          ) : null}

          {/* Group */}
          {group ? (
            <div className="pb-3 border-b border-border">
              <div className="flex items-center gap-1 mb-1">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-semibold">GROUP</p>
              </div>
              <p className="text-sm font-medium text-foreground">{group.name}</p>
            </div>
          ) : null}

          {/* Permit Status */}
          <div className="pb-3 border-b border-border">
            <p className="text-xs text-muted-foreground font-semibold mb-1">PERMIT</p>
            {permit && permitDaysRemaining >= 0 ? (
              <div className="text-sm">
                <p className="font-medium text-success">✓ Active</p>
                <p className="text-xs text-muted-foreground mt-0.5">Valid until {formatDate(permit.end_date)}</p>
                {permit.permit_type && (
                  <div className="mt-1.5">
                    {permit.permit_type === 'provisional' ? (
                      <span className="inline-flex items-center bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                        Provisional Permit
                      </span>
                    ) : (
                      <span className="inline-flex items-center bg-success/10 text-success rounded-full px-2 py-0.5 text-[10px] font-semibold">
                        Full Permit
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm font-medium text-destructive">✗ No Active Permit</p>
            )}
          </div>

          {/* Insurance Status */}
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-1">INSURANCE</p>
            {policy && insuranceDaysRemaining >= 0 ? (
              <div className="text-sm">
                <p className="font-medium text-success">✓ Active</p>
                <p className="text-xs text-muted-foreground mt-0.5">Valid until {formatDate(policy.end_date)}</p>
              </div>
            ) : (
              <p className="text-sm font-medium text-destructive">✗ No Active Insurance</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-2 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">Verified by BodaSure</p>
          <p className="text-[10px] text-muted-foreground">Last verified: {verifyTime}</p>
        </div>
      </div>
    </div>
  );
}
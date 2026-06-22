import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import { differenceInDays } from 'date-fns';
import { AlertCircle, MapPin, Users } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';
import { useAuth } from '@/lib/AuthContext';

const getComplianceTier = (verificationComplete, bikeApproved, permitActive, insuranceActive, hasGroup) => {
  if (verificationComplete && bikeApproved && permitActive && insuranceActive) return { tier: 'Fully Verified', color: 'bg-success', textColor: 'text-success' };
  if (bikeApproved && permitActive) return { tier: 'Road-Ready', color: 'bg-chart-1', textColor: 'text-chart-1' };
  if (bikeApproved) return { tier: 'Partial', color: 'bg-warning', textColor: 'text-warning' };
  return { tier: 'Non-Compliant', color: 'bg-destructive', textColor: 'text-destructive' };
};

export default function RiderVerify() {
  const { riderId } = useParams();
  const navigate = useNavigate();
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

  // Wait for auth to finish loading before attempting to fetch data
  if (isLoadingAuth) {
    return <PageSkeleton variant="hero-rows" />;
  }

  useEffect(() => {
    async function load() {
      try {
        // Fetch rider
        const riderData = await base44.entities.User.get(riderId);
        if (!riderData) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setRider(riderData);

        // Fetch vehicle, permit, policy in parallel
        const [vehicleData, permitData, policyData, groupMemberData] = await Promise.all([
          base44.entities.Vehicle.filter({ rider_id: riderId }, '-created_date').then(vs => vs[0] || null),
          base44.entities.Permit.filter({ rider_id: riderId, status: 'active' }, '-end_date').then(ps => ps[0] || null),
          base44.entities.Policy.filter({ rider_id: riderId, status: 'active' }, '-end_date').then(pls => pls[0] || null),
          base44.entities.GroupMember.filter({ user_id: riderId, status: 'approved' }).then(gms => gms[0] || null),
        ]);

        setVehicle(vehicleData);
        setPermit(permitData);
        setPolicy(policyData);

        if (vehicleData) {
          const [countyData, stageData] = await Promise.all([
            vehicleData.county_id ? base44.entities.County.get(vehicleData.county_id) : null,
            vehicleData.stage_id ? base44.entities.Stage.get(vehicleData.stage_id) : null,
          ]);
          setCounty(countyData);
          setStage(stageData);
        }

        if (groupMemberData) {
          const groupData = await base44.entities.Group.get(groupMemberData.group_id);
          setGroup(groupData);
        }
      } catch (e) {
        setError(e.message || 'Failed to load verification data');
      }
      setLoading(false);
    }
    if (riderId) load();
  }, [riderId]);

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

  const selfieDoc = rider?.KycDocuments?.find(d => d.document_type === 'selfie');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-transparent p-6 text-center border-b border-border">
        <div className="text-sm font-bold text-primary mb-2">BODASURE</div>
        <h1 className="text-xl font-heading font-bold text-foreground">Rider Verification</h1>
      </div>

      {/* Content */}
      <div className="max-w-sm mx-auto p-5 space-y-4">
        {/* Rider Photo */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {selfieDoc?.file_url ? (
              <img
                src={selfieDoc.file_url}
                alt={rider?.full_name}
                className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-primary/20">
                <span className="text-2xl font-bold text-muted-foreground">{rider?.full_name?.charAt(0) || '?'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="text-center">
          <h2 className="text-lg font-heading font-bold text-foreground">{rider?.full_name || 'Unknown'}</h2>
          {rider?.national_id && <p className="text-xs text-muted-foreground mt-1">ID: {rider.national_id}</p>}
        </div>

        {/* Compliance Tier Badge */}
        <div className={`${compliance.color}/10 border border-${compliance.color}/30 rounded-xl p-3 text-center`}>
          <p className={`text-xs font-semibold ${compliance.textColor} uppercase`}>{compliance.tier}</p>
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
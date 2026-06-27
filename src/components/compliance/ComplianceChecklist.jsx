import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

function ChecklistRow({ label, status, link, subLabel }) {
  const navigate = useNavigate();
  const isComplete = status === 'verified';

  const badgeConfig = {
    verified: { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success', label: 'Complete' },
    submitted: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', label: 'Incomplete' },
    in_progress: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', label: 'Incomplete' },
    rejected: { bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive', label: 'Rejected' },
    not_started: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', label: 'Incomplete' },
  };

  const badge = badgeConfig[status] || badgeConfig.not_started;

  return (
    <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
      <div className="flex items-center gap-3 flex-1">
        {isComplete && <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />}
        <div>
          <p className="text-sm font-medium">{label}</p>
          {subLabel && <p className="text-xs text-muted-foreground">{subLabel}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${badge.bg} ${badge.border} ${badge.text}`}>
          {badge.label}
        </span>
        {!isComplete && link && (
          <button
            onClick={() => navigate(link)}
            className="text-warning hover:text-warning/80 font-semibold text-xs ml-2"
          >
            Fix →
          </button>
        )}
      </div>
    </div>
  );
}

export default function ComplianceChecklist({ user, vehicle, taskStatuses, wallet, groupMember }) {
  const taskStatusMap = Object.fromEntries(taskStatuses.map(t => [t.id, t.status]));

  return (
    <div className="space-y-6 mb-6">
      {/* Section 1: Onboarding */}
      <div>
        <h2 className="text-sm font-heading font-bold mb-3 text-foreground">Onboarding</h2>
        <div className="space-y-2">
          <ChecklistRow
            label="Profile Complete"
            status={user?.full_name && user?.phone && user?.national_id ? 'verified' : 'not_started'}
            link="/app/profile"
          />
          <ChecklistRow
            label="Bike Registered"
            status={vehicle ? 'verified' : 'not_started'}
            link="/app/bikes/register"
          />
          <ChecklistRow
            label="Bike Approved"
            status={vehicle?.status === 'approved' ? 'verified' : vehicle?.status === 'pending' ? 'in_progress' : 'not_started'}
            subLabel={vehicle?.status === 'pending' ? 'Awaiting county review' : undefined}
            link="/app/bikes"
          />
          <ChecklistRow
            label="County & Stage Mapped"
            status={vehicle?.stage_id && vehicle?.sub_county_id && vehicle?.ward_id ? 'verified' : 'not_started'}
            link="/app/profile"
          />
          <ChecklistRow
            label="SACCO Joined"
            status={groupMember ? 'verified' : 'not_started'}
            link="/app/groups"
          />
        </div>
      </div>

      {/* Section 2: KYC & Verification (Phase 6 Sub-tasks) */}
      <div>
        <h2 className="text-sm font-heading font-bold mb-3 text-foreground">Identity & Verification</h2>
        <div className="space-y-2">
          <ChecklistRow
            label="ID Verification (Front & Back)"
            status={taskStatusMap.identity || 'not_started'}
            subLabel={taskStatusMap.identity === 'submitted' ? 'Awaiting review' : undefined}
            link="/app/profile"
          />
          <ChecklistRow
            label="Bike Photos (4 angles)"
            status={taskStatusMap.bike || 'not_started'}
            subLabel={taskStatusMap.bike === 'submitted' ? 'Awaiting review' : undefined}
            link="/app/profile"
          />
          <ChecklistRow
            label="Owner Verification"
            status={taskStatusMap.owner || 'not_started'}
            subLabel={taskStatusMap.owner === 'in_progress' ? 'Invitation sent, awaiting response' : undefined}
            link="/app/profile"
          />
        </div>
      </div>

      {/* Section 3: Financial Compliance */}
      <div>
        <h2 className="text-sm font-heading font-bold mb-3 text-foreground">Financial & Legal</h2>
        <div className="space-y-2">
          <ChecklistRow
            label="Wallet Activated"
            status={wallet?.status === 'active' ? 'verified' : 'not_started'}
            link="/app/wallet/activate"
          />
          <ChecklistRow
            label="KYC Verified"
            status={user?.kyc_status === 'verified' ? 'verified' : user?.kyc_status === 'pending' ? 'submitted' : 'not_started'}
            subLabel={user?.kyc_status === 'pending' ? 'Under review' : undefined}
            link="/app/profile"
          />
        </div>
      </div>
    </div>
  );
}
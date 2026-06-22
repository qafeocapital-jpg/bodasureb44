import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { VERIFICATION_TASKS, TASK_STATUS_CONFIG } from '@/lib/verification';

function ChecklistRow({ icon: Icon, label, status, link, subLabel }) {
  const config = TASK_STATUS_CONFIG[status] || TASK_STATUS_CONFIG.not_started;

  return (
    <Link
      to={link}
      className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 hover:bg-accent transition-colors"
    >
      <div className="flex items-center gap-3 flex-1">
        {Icon && <Icon className={`w-5 h-5 ${config.className}`} />}
        <div>
          <p className="text-sm font-medium">{label}</p>
          {subLabel && <p className="text-xs text-muted-foreground">{subLabel}</p>}
        </div>
      </div>
      {status !== 'verified' && status !== 'not_started' && (
        <span className="text-xs text-primary font-semibold">Fix →</span>
      )}
    </Link>
  );
}

export default function ComplianceChecklist({ user, vehicle, taskStatuses, wallet }) {
  const taskStatusMap = Object.fromEntries(taskStatuses.map(t => [t.id, t.status]));

  return (
    <div className="space-y-6 mb-6">
      {/* Section 1: Onboarding */}
      <div>
        <h2 className="text-sm font-heading font-bold mb-3 text-foreground">Onboarding</h2>
        <div className="space-y-2">
          <ChecklistRow
            icon={user?.full_name && user?.phone && user?.national_id ? CheckCircle2 : XCircle}
            label="Profile Complete"
            status={user?.full_name && user?.phone && user?.national_id ? 'verified' : 'not_started'}
            link="/app/profile"
          />
          <ChecklistRow
            icon={vehicle ? CheckCircle2 : XCircle}
            label="Bike Registered"
            status={vehicle ? 'verified' : 'not_started'}
            link="/app/bikes/register"
          />
          <ChecklistRow
            icon={vehicle?.status === 'approved' ? CheckCircle2 : vehicle?.status === 'pending' ? Clock : XCircle}
            label="Bike Approved"
            status={vehicle?.status === 'approved' ? 'verified' : vehicle?.status === 'pending' ? 'in_progress' : 'not_started'}
            subLabel={vehicle?.status === 'pending' ? 'Awaiting county review' : undefined}
            link="/app/bikes"
          />
          <ChecklistRow
            icon={vehicle?.stage_id ? CheckCircle2 : XCircle}
            label="County & Stage Mapped"
            status={vehicle?.stage_id ? 'verified' : 'not_started'}
            link="/app/profile"
          />
          <ChecklistRow
            icon={user?.group_id ? CheckCircle2 : XCircle}
            label="SACCO Joined"
            status={user?.group_id ? 'verified' : 'not_started'}
            link="/app/groups"
          />
        </div>
      </div>

      {/* Section 2: KYC & Verification (Phase 6 Sub-tasks) */}
      <div>
        <h2 className="text-sm font-heading font-bold mb-3 text-foreground">Identity & Verification</h2>
        <div className="space-y-2">
          <ChecklistRow
            icon={
              taskStatusMap.id === 'verified' ? CheckCircle2 : taskStatusMap.id === 'submitted' ? Clock : taskStatusMap.id === 'in_progress' ? Clock : XCircle
            }
            label="ID Verification (Front & Back)"
            status={taskStatusMap.id || 'not_started'}
            subLabel={taskStatusMap.id === 'submitted' ? 'Awaiting review' : undefined}
            link="/app/kyc"
          />
          <ChecklistRow
            icon={
              taskStatusMap.bike === 'verified' ? CheckCircle2 : taskStatusMap.bike === 'submitted' ? Clock : taskStatusMap.bike === 'in_progress' ? Clock : XCircle
            }
            label="Bike Photos (4 angles)"
            status={taskStatusMap.bike || 'not_started'}
            subLabel={taskStatusMap.bike === 'submitted' ? 'Awaiting review' : undefined}
            link="/app/kyc"
          />
          <ChecklistRow
            icon={
              taskStatusMap.selfie === 'verified' ? CheckCircle2 : taskStatusMap.selfie === 'submitted' ? Clock : taskStatusMap.selfie === 'in_progress' ? Clock : XCircle
            }
            label="Rider Selfie"
            status={taskStatusMap.selfie || 'not_started'}
            subLabel={taskStatusMap.selfie === 'submitted' ? 'Awaiting review' : undefined}
            link="/app/kyc"
          />
          <ChecklistRow
            icon={taskStatusMap.phone === 'verified' ? CheckCircle2 : XCircle}
            label="Phone Verification (OTP)"
            status={taskStatusMap.phone || 'not_started'}
            link="/app/kyc"
          />
          <ChecklistRow
            icon={
              taskStatusMap.owner === 'verified' ? CheckCircle2 : taskStatusMap.owner === 'in_progress' ? Clock : XCircle
            }
            label="Owner Verification"
            status={taskStatusMap.owner || 'not_started'}
            subLabel={taskStatusMap.owner === 'in_progress' ? 'Invitation sent, awaiting response' : undefined}
            link="/app/kyc"
          />
        </div>
      </div>

      {/* Section 3: Financial Compliance */}
      <div>
        <h2 className="text-sm font-heading font-bold mb-3 text-foreground">Financial & Legal</h2>
        <div className="space-y-2">
          <ChecklistRow
            icon={wallet?.status === 'active' ? CheckCircle2 : XCircle}
            label="Wallet Activated"
            status={wallet?.status === 'active' ? 'verified' : 'not_started'}
            link="/app/wallet/activate"
          />
          <ChecklistRow
            icon={user?.kyc_status === 'approved' ? CheckCircle2 : user?.kyc_status === 'pending' ? Clock : XCircle}
            label="KYC Approved (Tier 2)"
            status={user?.kyc_status === 'approved' ? 'verified' : user?.kyc_status === 'pending' ? 'submitted' : 'not_started'}
            subLabel={user?.kyc_status === 'pending' ? 'Under review' : undefined}
            link="/app/kyc"
          />
        </div>
      </div>
    </div>
  );
}
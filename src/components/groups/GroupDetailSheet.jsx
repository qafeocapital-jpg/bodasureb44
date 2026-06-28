import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { X, ShieldCheck, Users, FileText, Banknote, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import GroupKybCommittee from './GroupKybCommittee';
import GroupKybDocuments from './GroupKybDocuments';
import GroupKybBusiness from './GroupKybBusiness';
import GroupMemberManagement from './GroupMemberManagement';

const STATE_LABELS = {
  DRAFT: 'Draft',
  BASIC_ACTIVE: 'Live — Basic',
  KYB_PENDING: 'KYB Under Review',
  KYB_REVIEW: 'KYB In Review',
  VERIFIED: 'Verified',
  SUSPENDED: 'Suspended',
  DEACTIVATED: 'Deactivated',
};

const STATE_COLORS = {
  DRAFT: 'bg-muted text-muted-foreground',
  BASIC_ACTIVE: 'bg-green-100 text-green-700',
  KYB_PENDING: 'bg-amber-100 text-amber-700',
  KYB_REVIEW: 'bg-amber-100 text-amber-700',
  VERIFIED: 'bg-blue-100 text-blue-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  DEACTIVATED: 'bg-muted text-muted-foreground',
};

export default function GroupDetailSheet({ groupId, onClose }) {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kybStep, setKybStep] = useState('committee');

  useEffect(() => { load(); }, [groupId]);

  async function load() {
    if (!groupId) return;
    setLoading(true);
    try {
      const [g, offs] = await Promise.all([
        base44.entities.Group.get(groupId),
        base44.entities.GroupOfficial.filter({ group_id: groupId }),
      ]);
      setGroup(g);
      setOfficials(offs);
    } catch (e) {}
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-full max-w-[512px] bg-card rounded-t-3xl py-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!group) return null;

  const isOfficial = officials.some(o => o.user_id === user?.id && o.status === 'active');
  const state = group.group_state || 'BASIC_ACTIVE';
  const showKyb = isOfficial && ['BASIC_ACTIVE', 'KYB_PENDING', 'KYB_REVIEW', 'VERIFIED'].includes(state);

  const kybSteps = [
    { id: 'committee', label: 'Committee', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'business', label: 'Business', icon: Banknote },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[512px] bg-card rounded-t-3xl pb-8 animate-slide-up max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card px-5 pt-5 pb-3 border-b border-border z-10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading font-bold text-lg">{group.name}</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${STATE_COLORS[state] || 'bg-muted text-muted-foreground'}`}>
              {STATE_LABELS[state] || state}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize">{group.type}</span>
            <span className="text-[10px] text-muted-foreground">{group.member_count || 0} members</span>
            {group.duplicate_flagged && (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">Flagged</span>
            )}
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* KYB Verification Banner */}
          {showKyb && state !== 'VERIFIED' && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <p className="text-sm font-bold text-amber-900">Verify Your Group</p>
              </div>
              <p className="text-xs text-amber-700">
                {state === 'KYB_PENDING' || state === 'KYB_REVIEW'
                  ? 'Your KYB submission is under review. We\'ll notify you when your business wallet is ready.'
                  : 'Complete the steps below to unlock a business wallet and start collecting contributions.'}
              </p>
            </div>
          )}

          {state === 'VERIFIED' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm font-medium text-green-800">Group verified! Business wallet active.</p>
            </div>
          )}

          {/* Coverage info */}
          {group.coverage_type && (
            <div className="bg-muted/50 rounded-xl p-3 text-xs">
              <p className="text-muted-foreground">Coverage: <span className="font-medium text-foreground capitalize">
                {group.coverage_type === 'county' ? 'Whole County' : group.coverage_type === 'sub_county' ? 'Sub-Counties' : 'Wards'}
              </span></p>
              {group.membership_size_band && (
                <p className="text-muted-foreground mt-0.5">Size: <span className="font-medium text-foreground">{group.membership_size_band} members</span></p>
              )}
            </div>
          )}

          {/* KYB Steps */}
          {showKyb && state !== 'VERIFIED' && (
            <div>
              {/* Step tabs */}
              <div className="flex gap-1.5 mb-4 bg-muted rounded-xl p-1">
                {kybSteps.map(step => {
                  const Icon = step.icon;
                  const isDisabled = state === 'KYB_PENDING' || state === 'KYB_REVIEW';
                  return (
                    <button
                      key={step.id}
                      onClick={() => !isDisabled && setKybStep(step.id)}
                      disabled={isDisabled}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        kybStep === step.id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {step.label}
                    </button>
                  );
                })}
              </div>

              {/* Step content */}
              {state === 'KYB_PENDING' || state === 'KYB_REVIEW' ? (
                <div className="text-center py-6">
                  <Clock className="w-10 h-10 mx-auto text-amber-500 mb-2" />
                  <p className="text-sm font-medium">Under Review</p>
                  <p className="text-xs text-muted-foreground mt-1">Your KYB submission is being reviewed by BodaSure. This usually takes 1-2 business days.</p>
                  {group.kyb_rejection_reason && (
                    <p className="text-xs text-red-600 mt-2">Previous rejection: {group.kyb_rejection_reason}</p>
                  )}
                </div>
              ) : (
                <>
                  {kybStep === 'committee' && <GroupKybCommittee group={group} />}
                  {kybStep === 'documents' && <GroupKybDocuments group={group} />}
                  {kybStep === 'business' && <GroupKybBusiness group={group} onSubmitted={load} />}
                </>
              )}
            </div>
          )}

          {/* Member Management for officials */}
          {isOfficial && <GroupMemberManagement group={group} />}

          {/* Non-official view */}
          {!isOfficial && (
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">You are a member of this group. Only officials can view KYB details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
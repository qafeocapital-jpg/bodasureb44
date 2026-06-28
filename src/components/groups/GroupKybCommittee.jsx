import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Users, UserPlus, Phone, Loader2, CheckCircle2, Clock, XCircle, ShieldCheck, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const OFFICIAL_ROLES = [
  { value: 'chairperson', label: 'Chairperson' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'committee_member', label: 'Committee Member' },
];

export default function GroupKybCommittee({ group }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('treasurer');
  const [inviting, setInviting] = useState(false);

  useEffect(() => { load(); }, [group?.id]);

  async function load() {
    if (!group?.id) return;
    setLoading(true);
    try {
      const list = await base44.entities.GroupOfficial.filter({ group_id: group.id });
      setOfficials(list);
    } catch (e) {}
    setLoading(false);
  }

  async function handleInvite() {
    if (!invitePhone.trim()) return;
    setInviting(true);
    try {
      await base44.functions.invoke('inviteGroupOfficial', {
        groupId: group.id,
        phone: invitePhone.trim(),
        role: inviteRole,
        officialName: inviteName.trim() || undefined,
      });
      toast({ title: 'Invitation sent', description: `SMS sent to ${invitePhone}` });
      setInvitePhone(''); setInviteName('');
      load();
    } catch (e) {
      toast({ title: 'Failed to invite', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
    setInviting(false);
  }

  const activeOfficials = officials.filter(o => o.status === 'active');
  const verifiedOfficials = activeOfficials.filter(o => o.kyc_complete);
  const hasChair = activeOfficials.some(o => o.role === 'chairperson');
  const quorumMet = hasChair && verifiedOfficials.length >= 2;

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Quorum Indicator */}
      <div className={`rounded-xl p-4 border ${quorumMet ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className={`w-5 h-5 ${quorumMet ? 'text-green-600' : 'text-amber-600'}`} />
          <p className={`text-sm font-bold ${quorumMet ? 'text-green-900' : 'text-amber-900'}`}>
            {quorumMet ? 'KYB Quorum Met' : 'Quorum Not Yet Met'}
          </p>
        </div>
        <p className={`text-xs ${quorumMet ? 'text-green-700' : 'text-amber-700'}`}>
          Requires Chairperson + at least 1 other verified official. Currently: {verifiedOfficials.length} verified.
        </p>
      </div>

      {/* Officials List */}
      <div>
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Committee Officials</h4>
        <div className="space-y-2">
          {officials.map(o => (
            <div key={o.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${o.kyc_complete ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                {o.kyc_complete ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize">{o.role.replace('_', ' ')}</p>
                <p className="text-[10px] text-muted-foreground">
                  {o.user_id ? 'BodaSure user' : 'Not yet registered'} · {o.invite_phone || '—'}
                </p>
              </div>
              <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                o.status === 'active' ? 'bg-green-100 text-green-700'
                : o.status === 'pending' ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
              }`}>
                {o.status}
              </span>
            </div>
          ))}
          {officials.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No officials yet.</p>}
        </div>
      </div>

      {/* Invite Form */}
      <div className="border-t border-border pt-4">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Invite Another Official</h4>
        <p className="text-[11px] text-muted-foreground mb-3">Enter their phone number — they'll get an SMS invite to join BodaSure and confirm their role.</p>
        <div className="space-y-2">
          <input
            value={inviteName}
            onChange={e => setInviteName(e.target.value)}
            placeholder="Official's name (optional)"
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={invitePhone}
                onChange={e => setInvitePhone(e.target.value)}
                placeholder="2547XX..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm"
              />
            </div>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="px-2 py-2.5 rounded-xl border border-input bg-background text-sm">
              {OFFICIAL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <button
            onClick={handleInvite}
            disabled={!invitePhone.trim() || inviting}
            className="w-full flex items-center justify-center gap-1 bg-primary text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Send Invite</>}
          </button>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { UserPlus, Check, X, Clock, Loader2, Users, MapPin, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/format';

export default function SaccoApplications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('members');
  const [pendingMembers, setPendingMembers] = useState([]);
  const [stageApps, setStageApps] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviting, setInviting] = useState(false);

  const saccoGroupId = user?.scope_entity_id;
  const countyId = user?.county_id;

  useEffect(() => {
    load();
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const [members, stages] = await Promise.all([
        base44.entities.GroupMember.filter({ group_id: saccoGroupId, status: 'pending' }),
        base44.entities.Stage.filter({ county_id: countyId, application_status: 'pending_sacco' }),
      ]);
      setPendingMembers(members);
      setStageApps(stages);

      // Fetch rider names for pending members
      const riderIds = [...new Set(members.map(m => m.user_id))];
      if (riderIds.length > 0) {
        const riderData = await Promise.all(riderIds.map(id => base44.entities.User.get(id).catch(() => null)));
        setRiders(riderData.filter(Boolean));
      }
    } catch (e) {}
    setLoading(false);
  }

  async function approveMember(memberId) {
    setActing(memberId);
    try {
      await base44.entities.GroupMember.update(memberId, { status: 'approved', joined_date: new Date().toISOString() });
      toast({ title: 'Member approved' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setActing(null);
  }

  async function rejectMember(memberId) {
    setActing(memberId);
    try {
      await base44.entities.GroupMember.update(memberId, { status: 'rejected' });
      toast({ title: 'Member rejected' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setActing(null);
  }

  async function approveStageApp(stageId) {
    setActing(stageId);
    try {
      const stage = stageApps.find(s => s.id === stageId);
      await base44.entities.Stage.update(stageId, {
        application_status: 'pending_county',
        sacco_approved_at: new Date().toISOString(),
      });
      await base44.entities.Announcement.create({
        title: 'Stage Leader Application Forwarded',
        body: `Stage "${stage?.name || 'Unknown'}" has a leader application pending your approval. Please review in Registrations → Stages.`,
        audience: 'county_staff',
        county_id: countyId,
        status: 'published',
      });
      toast({ title: 'Approved — sent to County' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setActing(null);
  }

  async function rejectStageApp(stageId) {
    setActing(stageId);
    try {
      await base44.entities.Stage.update(stageId, {
        application_status: 'rejected',
        rejection_reason: 'Rejected by SACCO',
      });
      toast({ title: 'Application rejected' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setActing(null);
  }

  async function sendInvite() {
    if (!invitePhone) return;
    setInviting(true);
    try {
      await base44.entities.Announcement.create({
        title: 'SACCO Invitation',
        body: `You've been invited to join our SACCO. Open BodaSure → Groups to accept.`,
        audience: 'riders',
        status: 'published',
      });
      toast({ title: 'Invitation sent', description: `Invitation sent to ${invitePhone}` });
      setInvitePhone('');
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setInviting(false);
  }

  const riderName = (id) => riders.find(r => r.id === id)?.full_name || 'Unknown Rider';

  const tabs = [
    { id: 'members', label: 'Member Requests', icon: Users, count: pendingMembers.length },
    { id: 'stages', label: 'Stage Leader Apps', icon: MapPin, count: stageApps.length },
    { id: 'invite', label: 'Invite Member', icon: UserPlus, count: null },
  ];

  if (loading) {
    return <div className="p-6 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Applications & Approvals</h1>
      <p className="text-sm text-muted-foreground mb-5">Review membership and leadership applications</p>

      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
            {t.count !== null && t.count > 0 && <span className="bg-white/20 rounded-full px-1.5 text-[10px] font-bold">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'members' && (
        <div className="space-y-3">
          {pendingMembers.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No pending member requests</p>
            </div>
          ) : (
            pendingMembers.map(m => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{riderName(m.user_id)}</p>
                  <p className="text-xs text-muted-foreground">Applied: {formatDate(m.created_date)}</p>
                  <p className="text-xs text-muted-foreground capitalize">Role: {m.role}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveMember(m.id)} disabled={acting === m.id} className="flex items-center gap-1 bg-success text-white rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                    {acting === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Approve
                  </button>
                  <button onClick={() => rejectMember(m.id)} disabled={acting === m.id} className="flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                    <X className="w-3 h-3" /> Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'stages' && (
        <div className="space-y-3">
          {stageApps.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No pending stage leader applications</p>
            </div>
          ) : (
            stageApps.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground">Applied: {formatDate(s.application_submitted_at)}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                    <Clock className="w-3 h-3" /> Step 1
                  </span>
                </div>
                {s.pending_leader_note && <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mb-2">"{s.pending_leader_note}"</p>}
                <div className="flex gap-2">
                  <button onClick={() => approveStageApp(s.id)} disabled={acting === s.id} className="flex items-center gap-1 bg-success text-white rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                    {acting === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Approve → County
                  </button>
                  <button onClick={() => rejectStageApp(s.id)} disabled={acting === s.id} className="flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                    <X className="w-3 h-3" /> Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'invite' && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h2 className="font-heading font-bold">Invite a Member</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Enter a phone number to send a SACCO invitation. The rider will see it in their BodaSure app.</p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={invitePhone}
              onChange={e => setInvitePhone(e.target.value)}
              placeholder="2547XX..."
              className="flex-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
            />
            <button
              onClick={sendInvite}
              disabled={!invitePhone || inviting}
              className="flex items-center gap-1 bg-blue-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
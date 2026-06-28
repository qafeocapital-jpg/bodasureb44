import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate, formatKES } from '@/lib/format';
import { Building2, Plus, Pencil, Trash2, Loader2, X, Banknote, Users, Clock, Check, FileText, ChevronRight, AlertTriangle, Copy, GitMerge, ShieldAlert } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SaccoPendingMembers from '@/components/admin/SaccoPendingMembers';
import KybDocsPreview from '@/components/admin/KybDocsPreview';

const KENYAN_BANKS = [
  'Kenya Commercial Bank (KCB)', 'Equity Bank', 'Cooperative Bank', 'Standard Chartered',
  'Absa Bank Kenya', 'NCBA Bank', 'I&M Bank', 'Stanbic Bank', 'Diamond Trust Bank',
  'Sidian Bank', 'Family Bank', 'Guardian Bank', 'Gulf African Bank', 'National Bank of Kenya',
];

export default function AdminSaccos() {
  const { toast } = useToast();
  const [groups, setGroups] = useState([]);
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [acting, setActing] = useState(null);
  const [tab, setTab] = useState('saccos');
  const [reviewGroup, setReviewGroup] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const [form, setForm] = useState({
    name: '', type: 'sacco', county_id: '', status: 'active', description: '',
    sasapay_account_number: '',
    bank_name: '', bank_account_name: '', bank_account_number: '', bank_branch: '',
    mpesa_till_number: '', official_name: '', official_phone: '', official_email: '',
  });

  useEffect(() => { load(); }, []);

  const [officialsMap, setOfficialsMap] = useState({});
  const [disputes, setDisputes] = useState([]);
  const [duplicates, setDuplicates] = useState([]);

  async function load() {
    setLoading(true);
    try {
      const [allGroups, cs] = await Promise.all([
        base44.entities.Group.filter({}, '-created_date', 200),
        base44.entities.County.filter({}),
      ]);
      setGroups(allGroups);
      setCounties(cs);

      // Fetch officials for KYB groups
      const kybGroupIds = allGroups
        .filter(g => ['KYB_PENDING', 'KYB_REVIEW'].includes(g.group_state))
        .map(g => g.id);
      if (kybGroupIds.length > 0) {
        const allOfficials = await Promise.all(
          kybGroupIds.map(id => base44.entities.GroupOfficial.filter({ group_id: id }).catch(() => []))
        );
        const map = {};
        kybGroupIds.forEach((id, i) => { map[id] = allOfficials[i]; });
        setOfficialsMap(map);
      }

      // Fetch governance disputes
      const disputeLogs = await base44.entities.AuditLog.filter({ action: 'governance_dispute' }, '-created_date', 50).catch(() => []);
      setDisputes(disputeLogs);

      // Duplicates
      setDuplicates(allGroups.filter(g => g.duplicate_flagged));
    } catch (e) {}
    setLoading(false);
  }

  async function approveSacco(group) {
    setReviewing(true);
    try {
      // Transition group state to VERIFIED via the state machine
      await base44.functions.invoke('transitionGroupState', {
        groupId: group.id,
        event: 'group_verified',
        metadata: { description: `KYB approved by admin` },
      });

      // Update the submitting user's roles
      const groupOfficials = officialsMap[group.id] || [];
      const foundingOfficial = groupOfficials.find(o => o.status === 'active');
      if (foundingOfficial?.user_id) {
        const u = await base44.entities.User.get(foundingOfficial.user_id).catch(() => null);
        if (u) {
          const currentRoles = u.roles || ['rider'];
          const newRoles = currentRoles.includes('sacco_admin') ? currentRoles : [...currentRoles, 'sacco_admin'];
          await base44.entities.User.update(u.id, {
            roles: newRoles,
            scope_entity_id: group.id,
          });
        }
      } else if (group.official_phone) {
        const users = await base44.entities.User.filter({ phone: group.official_phone });
        if (users.length > 0) {
          const u = users[0];
          const currentRoles = u.roles || ['rider'];
          const newRoles = currentRoles.includes('sacco_admin') ? currentRoles : [...currentRoles, 'sacco_admin'];
          await base44.entities.User.update(u.id, {
            roles: newRoles,
            scope_entity_id: group.id,
          });
        }
      }

      toast({ title: 'Group Verified', description: `${group.name} is now verified. Business wallet provisioning will be triggered.` });
      setReviewGroup(null);
      load();
    } catch (e) {
      toast({ title: 'Failed to approve', description: e.message, variant: 'destructive' });
    }
    setReviewing(false);
  }

  async function rejectSacco(group, reason) {
    setReviewing(true);
    try {
      // Transition back to BASIC_ACTIVE with rejection reason
      await base44.functions.invoke('transitionGroupState', {
        groupId: group.id,
        event: 'kyb_rejected',
        metadata: { description: `KYB rejected: ${reason}`, kyb_rejection_reason: reason },
      });

      toast({ title: 'KYB Rejected', description: `${group.name} has been sent back to Basic. Reason recorded.` });
      setReviewGroup(null);
      setShowRejectInput(false);
      setRejectReason('');
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setReviewing(false);
  }

  async function resolveDispute(dispute, action) {
    // action: 'assign_primary' | 'reject_challenger'
    setActing(dispute.id);
    try {
      const metadata = dispute.new_values || {};
      const groupId = dispute.entity_id;
      if (action === 'assign_primary') {
        // Accept the challenger as an active official
        const challengerId = metadata.challenger_user_id;
        if (challengerId && groupId) {
          const pendingOfficials = await base44.entities.GroupOfficial.filter({ group_id: groupId, user_id: challengerId, status: 'pending' });
          for (const o of pendingOfficials) {
            await base44.entities.GroupOfficial.update(o.id, { status: 'active', confirmed_at: new Date().toISOString() });
          }
        }
        toast({ title: 'Dispute resolved', description: 'Challenger assigned as additional official.' });
      } else {
        // Reject challenger
        const challengerId = metadata.challenger_user_id;
        if (challengerId && groupId) {
          const pendingOfficials = await base44.entities.GroupOfficial.filter({ group_id: groupId, user_id: challengerId, status: 'pending' });
          for (const o of pendingOfficials) {
            await base44.entities.GroupOfficial.update(o.id, { status: 'rejected' });
          }
        }
        toast({ title: 'Challenger rejected' });
      }
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setActing(null);
  }

  async function mergeDuplicate(dupGroup, primaryGroup) {
    setActing(dupGroup.id);
    try {
      // Move members from duplicate to primary
      const members = await base44.entities.GroupMember.filter({ group_id: dupGroup.id });
      for (const m of members) {
        await base44.entities.GroupMember.update(m.id, { group_id: primaryGroup.id });
      }
      // Deactivate duplicate
      await base44.functions.invoke('transitionGroupState', {
        groupId: dupGroup.id,
        event: 'group_deactivated',
        metadata: { description: `Merged into ${primaryGroup.name}`, duplicate_of_group_id: primaryGroup.id },
      });
      await base44.entities.Group.update(dupGroup.id, { duplicate_of_group_id: primaryGroup.id });
      toast({ title: 'Groups merged', description: `${dupGroup.name} merged into ${primaryGroup.name}.` });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setActing(null);
  }

  async function keepBoth(dupGroup) {
    setActing(dupGroup.id);
    try {
      await base44.entities.Group.update(dupGroup.id, { duplicate_flagged: false });
      toast({ title: 'Flag cleared', description: `${dupGroup.name} will remain separate.` });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setActing(null);
  }

  function openCreate() {
    setEditing(null);
    setForm({
      name: '', type: 'sacco', county_id: '', status: 'active', description: '',
      sasapay_account_number: '',
      bank_name: '', bank_account_name: '', bank_account_number: '', bank_branch: '',
      mpesa_till_number: '', official_name: '', official_phone: '', official_email: '',
    });
    setShowModal(true);
  }

  function openEdit(g) {
    setEditing(g);
    setForm({
      name: g.name || '', type: g.type || 'sacco', county_id: g.county_id || '', status: g.status || 'active', description: g.description || '',
      sasapay_account_number: g.sasapay_account_number || '',
      bank_name: g.bank_name || '', bank_account_name: g.bank_account_name || '', bank_account_number: g.bank_account_number || '', bank_branch: g.bank_branch || '',
      mpesa_till_number: g.mpesa_till_number || '', official_name: g.official_name || '', official_phone: g.official_phone || '', official_email: g.official_email || '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.county_id) {
      toast({ title: 'Missing fields', description: 'Name and county are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.Group.update(editing.id, form);
        toast({ title: 'SACCO updated' });
      } else {
        await base44.entities.Group.create(form);
        toast({ title: 'SACCO created' });
      }
      setShowModal(false);
      load();
    } catch (e) {
      toast({ title: 'Failed to save', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await base44.entities.Group.delete(id);
      toast({ title: 'SACCO deleted' });
      load();
    } catch (e) {
      toast({ title: 'Failed to delete', description: e.message, variant: 'destructive' });
    }
    setDeleting(null);
  }

  const countyName = (id) => counties.find(c => c.id === id)?.name || '—';

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-heading font-bold">SACCOs</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage SACCOs and their bank details</p>
        </div>
        {tab === 'saccos' && (
          <button onClick={openCreate} className="flex items-center gap-1 bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
            <Plus className="w-4 h-4" /> Create SACCO
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setTab('saccos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'saccos' ? 'bg-orange-500 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}
        >
          <Building2 className="w-4 h-4" /> All Groups
        </button>
        <button
          onClick={() => setTab('pending_approval')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'pending_approval' ? 'bg-orange-500 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}
        >
          <Clock className="w-4 h-4" /> KYB Review Queue
          {groups.filter(g => ['KYB_PENDING', 'KYB_REVIEW'].includes(g.group_state)).length > 0 && (
            <span className="bg-white/20 rounded-full px-1.5 text-[10px] font-bold">{groups.filter(g => ['KYB_PENDING', 'KYB_REVIEW'].includes(g.group_state)).length}</span>
          )}
        </button>
        <button
          onClick={() => setTab('disputes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'disputes' ? 'bg-orange-500 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}
        >
          <ShieldAlert className="w-4 h-4" /> Disputes
          {disputes.length > 0 && <span className="bg-white/20 rounded-full px-1.5 text-[10px] font-bold">{disputes.length}</span>}
        </button>
        <button
          onClick={() => setTab('duplicates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'duplicates' ? 'bg-orange-500 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}
        >
          <Copy className="w-4 h-4" /> Duplicates
          {duplicates.length > 0 && <span className="bg-white/20 rounded-full px-1.5 text-[10px] font-bold">{duplicates.length}</span>}
        </button>
        <button
          onClick={() => setTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'pending' ? 'bg-orange-500 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}
        >
          <Users className="w-4 h-4" /> Pending Members
        </button>
      </div>

      {tab === 'pending' ? (
        loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <SaccoPendingMembers saccos={groups} counties={counties} />
        )
      ) : tab === 'saccos' && loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      ) : tab === 'saccos' && groups.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No groups created yet</p>
        </div>
      ) : tab === 'saccos' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">County</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Members</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">SasaPay Acct</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">State</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{g.name}</p>
                    {g.bank_name && <p className="text-xs text-muted-foreground">{g.bank_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{countyName(g.county_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{g.member_count || 0}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden lg:table-cell">{g.sasapay_account_number || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${(g.group_state || 'BASIC_ACTIVE') === 'VERIFIED' ? 'bg-blue-100 text-blue-700' : (g.group_state || 'BASIC_ACTIVE') === 'BASIC_ACTIVE' ? 'bg-green-100 text-green-700' : ['KYB_PENDING', 'KYB_REVIEW'].includes(g.group_state) ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                      {(g.group_state || 'BASIC_ACTIVE').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${g.status === 'active' ? 'bg-success/10 text-success' : g.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{g.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg hover:bg-accent">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(g.id)} disabled={deleting === g.id} className="p-1.5 rounded-lg hover:bg-destructive/10">
                        {deleting === g.id ? <Loader2 className="w-4 h-4 text-destructive animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* KYB Review Queue Tab */}
      {tab === 'pending_approval' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : groups.filter(g => ['KYB_PENDING', 'KYB_REVIEW'].includes(g.group_state)).length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No groups pending KYB review</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">State</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Officials</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Submitted</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {groups.filter(g => ['KYB_PENDING', 'KYB_REVIEW'].includes(g.group_state)).map(g => {
                    const officials = officialsMap[g.id] || [];
                    return (
                      <tr key={g.id} className="border-t border-border hover:bg-accent/50 cursor-pointer" onClick={() => setReviewGroup(g)}>
                        <td className="px-4 py-3 font-medium">{g.name}</td>
                        <td className="px-4 py-3 text-muted-foreground capitalize hidden md:table-cell">{g.type}</td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${g.group_state === 'KYB_REVIEW' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {g.group_state === 'KYB_REVIEW' ? 'In Review' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {officials.length} official{officials.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{formatDate(g.created_date)}</td>
                        <td className="px-4 py-3 text-right"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Disputes Tab */}
      {tab === 'disputes' && (
        <div>
          {disputes.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No governance disputes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {disputes.map(d => {
                const groupId = d.entity_id;
                const groupName = groups.find(g => g.id === groupId)?.name || 'Unknown Group';
                return (
                  <div key={d.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{groupName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{formatDate(d.created_date)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => resolveDispute(d, 'assign_primary')}
                        disabled={acting === d.id}
                        className="flex items-center gap-1 bg-success text-white rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      >
                        {acting === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Assign as Official
                      </button>
                      <button
                        onClick={() => resolveDispute(d, 'reject_challenger')}
                        disabled={acting === d.id}
                        className="flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      >
                        <X className="w-3 h-3" /> Reject Challenger
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Duplicates Tab */}
      {tab === 'duplicates' && (
        <div>
          {duplicates.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Copy className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No duplicate-flagged groups</p>
            </div>
          ) : (
            <div className="space-y-3">
              {duplicates.map(dup => {
                const countyGroups = groups.filter(g => g.county_id === dup.county_id && g.id !== dup.id);
                return (
                  <div key={dup.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{dup.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{dup.type} · {countyName(dup.county_id)}</p>
                        <p className="text-[10px] text-amber-600 mt-1">⚠ Flagged as potential duplicate</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="text-xs font-medium text-muted-foreground">Merge into:</label>
                      <select id={`merge-${dup.id}`} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                        <option value="">Select primary group...</option>
                        {countyGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          const select = document.getElementById(`merge-${dup.id}`);
                          const primaryId = select?.value;
                          if (!primaryId) { toast({ title: 'Select a primary group first', variant: 'destructive' }); return; }
                          mergeDuplicate(dup, groups.find(g => g.id === primaryId));
                        }}
                        disabled={acting === dup.id}
                        className="flex items-center gap-1 bg-primary text-white rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      >
                        {acting === dup.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitMerge className="w-3 h-3" />} Merge
                      </button>
                      <button
                        onClick={() => keepBoth(dup)}
                        disabled={acting === dup.id}
                        className="flex items-center gap-1 bg-muted text-muted-foreground border border-border rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      >
                        Keep Both
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Review Drawer */}
      {reviewGroup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReviewGroup(null)} />
          <div className="relative w-full max-w-[512px] bg-card rounded-t-3xl pb-8 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card px-5 pt-5 pb-3 border-b border-border flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg">Review KYB Submission</h3>
              <button onClick={() => setReviewGroup(null)} className="p-1 rounded-lg hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Section 1: Basic Identity */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Basic Identity</p>
                <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Group Name:</span><span className="font-medium">{reviewGroup.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Type:</span><span className="font-medium capitalize">{reviewGroup.type}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">County:</span><span className="font-medium">{countyName(reviewGroup.county_id)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Official Name:</span><span className="font-medium">{reviewGroup.official_name || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Official Phone:</span><span className="font-medium">{reviewGroup.official_phone || '—'}</span></div>
                </div>
              </div>

              {/* Section 2: Financial Identity */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Financial Identity</p>
                <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">KRA PIN:</span><span className="font-medium font-mono">{reviewGroup.kra_pin || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Reg. Cert. No.:</span><span className="font-medium">{reviewGroup.registration_number || '—'}</span></div>
                  {reviewGroup.bank_name && <div className="flex justify-between"><span className="text-muted-foreground">Bank:</span><span className="font-medium">{reviewGroup.bank_name}</span></div>}
                  {reviewGroup.bank_account_number && <div className="flex justify-between"><span className="text-muted-foreground">Acct No:</span><span className="font-medium font-mono">{reviewGroup.bank_account_number}</span></div>}
                  {reviewGroup.mpesa_till_number && <div className="flex justify-between"><span className="text-muted-foreground">M-Pesa Till:</span><span className="font-medium">{reviewGroup.mpesa_till_number}</span></div>}
                </div>
              </div>

              {/* Section 3: Business KYC */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Business KYC</p>
                <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Nature of Business:</span><span className="font-medium">{reviewGroup.nature_of_business || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Physical Address:</span><span className="font-medium">{reviewGroup.physical_address || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Est. Monthly Amount:</span><span className="font-medium">{reviewGroup.estimated_monthly_transaction_amount ? formatKES(reviewGroup.estimated_monthly_transaction_amount * 100) : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Purpose:</span><span className="font-medium">{reviewGroup.purpose || '—'}</span></div>
                </div>
              </div>

              {/* Officials */}
              {officialsMap[reviewGroup.id] && officialsMap[reviewGroup.id].length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Committee Officials</p>
                  <div className="space-y-2">
                    {officialsMap[reviewGroup.id].map(o => (
                      <div key={o.id} className="bg-muted/50 rounded-xl p-3 text-sm flex items-center justify-between">
                        <div>
                          <p className="font-medium capitalize">{o.role.replace('_', ' ')}</p>
                          <p className="text-xs text-muted-foreground">{o.invite_phone || 'No phone'} · {o.user_id ? 'Registered' : 'Not registered'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {o.kyc_complete && <span className="text-[10px] text-green-700 bg-green-100 rounded-full px-2 py-0.5">KYC ✓</span>}
                          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${o.status === 'active' ? 'bg-green-100 text-green-700' : o.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{o.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KYB Documents */}
              {reviewGroup.id && (
                <KybDocsPreview groupId={reviewGroup.id} />
              )}

              {/* Directors */}
              {reviewGroup.directors && reviewGroup.directors.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Directors</p>
                  <div className="space-y-2">
                    {reviewGroup.directors.map((d, idx) => (
                      <div key={idx} className="bg-muted/50 rounded-xl p-3 text-sm">
                        <p className="font-medium">{d.director_name}</p>
                        <p className="text-xs text-muted-foreground">ID: {d.director_id_number} · Mobile: {d.director_mobile_number}</p>
                        <p className="text-xs text-muted-foreground">KRA: {d.director_kra_pin || '—'} · Doc: {d.director_document_type}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection Input */}
              {showRejectInput && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Rejection Reason</label>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} placeholder="Explain why this application is rejected..." className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none" />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 sticky bottom-0 bg-card pt-3 border-t border-border">
                {showRejectInput ? (
                  <>
                    <button onClick={() => setShowRejectInput(false)} className="flex-1 border border-border rounded-xl py-3 text-sm font-semibold">Cancel</button>
                    <button onClick={() => rejectSacco(reviewGroup, rejectReason || 'Does not meet requirements')} disabled={reviewing || !rejectReason} className="flex-1 bg-destructive text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
                      {reviewing ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setShowRejectInput(true)} disabled={reviewing} className="flex-1 border border-destructive/20 text-destructive bg-destructive/5 rounded-xl py-3 text-sm font-semibold disabled:opacity-50">Reject</button>
                    <button onClick={() => approveSacco(reviewGroup)} disabled={reviewing} className="flex-1 flex items-center justify-center gap-1 bg-success text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">
                      {reviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Verify Group</>}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">{editing ? 'Edit SACCO' : 'Create SACCO'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">SACCO Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Kisumu Bodaboda SACCO" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">County *</label>
                <select value={form.county_id} onChange={e => setForm(f => ({ ...f, county_id: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                  <option value="">Select county</option>
                  {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border">
                <div className="flex items-center gap-2 mb-3"><Banknote className="w-4 h-4 text-orange-500" /><p className="text-sm font-semibold">Bank Details</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Bank Name</label>
                    <select value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                      <option value="">Select bank</option>
                      {KENYAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Account Name</label>
                    <input value={form.bank_account_name} onChange={e => setForm(f => ({ ...f, bank_account_name: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Account Number</label>
                    <input value={form.bank_account_number} onChange={e => setForm(f => ({ ...f, bank_account_number: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Branch</label>
                    <input value={form.bank_branch} onChange={e => setForm(f => ({ ...f, bank_branch: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">M-Pesa Till No.</label>
                    <input value={form.mpesa_till_number} onChange={e => setForm(f => ({ ...f, mpesa_till_number: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">SasaPay Acct No.</label>
                    <input value={form.sasapay_account_number} onChange={e => setForm(f => ({ ...f, sasapay_account_number: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <div className="flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-orange-500" /><p className="text-sm font-semibold">Official Contact</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Official Name</label>
                    <input value={form.official_name} onChange={e => setForm(f => ({ ...f, official_name: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Phone</label>
                    <input value={form.official_phone} onChange={e => setForm(f => ({ ...f, official_phone: e.target.value }))} placeholder="2547XX..." className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Email</label>
                    <input value={form.official_email} onChange={e => setForm(f => ({ ...f, official_email: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 sticky bottom-0 bg-card">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Update SACCO' : 'Create SACCO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
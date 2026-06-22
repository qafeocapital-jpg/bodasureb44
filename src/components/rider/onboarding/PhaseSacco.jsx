import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  ChevronLeft, ChevronRight, ChevronDown, Loader2, MapPin,
  Shield, AlertTriangle, ArrowRight, Info,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import GroupCard from '@/components/rider/onboarding/GroupCard';
import MembershipValueSheet from '@/components/rider/onboarding/MembershipValueSheet';
import { ReadOnlyBanner, ReadOnlyBackButton } from '@/components/rider/onboarding/ReadOnlyBanner';

export default function PhaseSacco({ user, counties, groupMembers, vehicle: vehicleProp, onJoined, onBack, readOnly, onExitReadOnly }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [riderConstituency, setRiderConstituency] = useState(null);
  const [hasWard, setHasWard] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmGroup, setConfirmGroup] = useState(null);
  const [joiningId, setJoiningId] = useState(null);
  const [joinedGroup, setJoinedGroup] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [openConstituencies, setOpenConstituencies] = useState(new Set());
  const [localMembership, setLocalMembership] = useState(groupMembers?.[0] || null);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  const [completing, setCompleting] = useState(false);
  const [pendingGroup, setPendingGroup] = useState(null);

  const countyName = counties?.find(c => c.id === user?.county_id)?.name || 'your county';
  const onboardingComplete = user?.onboarding_complete === true;

  useEffect(() => {
    async function load() {
      if (!user?.county_id) { setLoading(false); return; }
      try {
        const allGroups = await base44.entities.Group.filter({
          county_id: user.county_id,
          status: 'active',
        });
        setGroups(allGroups);

        const vehicle = vehicleProp;
        if (!vehicle?.ward_id) {
          setHasWard(false);
        } else {
          const ward = await base44.entities.Ward.get(vehicle.ward_id);
          if (ward?.constituency_id) {
            const constituency = await base44.entities.Constituency.get(ward.constituency_id);
            if (constituency?.name) {
              setRiderConstituency(constituency.name);
            }
          }
        }
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const independentOperator = groups.find(g => g.is_system_group || g.type === 'independent');
  const allSaccos = groups.filter(g => !g.is_system_group && g.type !== 'independent');

  const suggestedSaccos = riderConstituency && hasWard
    ? allSaccos.filter(g =>
        g.constituency_hint?.toLowerCase().trim() === riderConstituency.toLowerCase().trim()
      )
    : [];

  const groupedByConstituency = {};
  for (const g of allSaccos) {
    const key = g.constituency_hint || 'Other';
    if (!groupedByConstituency[key]) groupedByConstituency[key] = [];
    groupedByConstituency[key].push(g);
  }
  const constituencyNames = Object.keys(groupedByConstituency).sort();

  const currentGroupId = localMembership?.group_id;
  const currentGroup = groups.find(g => g.id === currentGroupId);
  const canSwitch = currentGroupId && !onboardingComplete && !joinedGroup;

  function toggleConstituency(name) {
    setOpenConstituencies(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleCardToggle(groupId) {
    setExpandedId(prev => prev === groupId ? null : groupId);
  }

  async function handleConfirmJoin() {
    const group = confirmGroup;
    setConfirmGroup(null);
    if (!group) return;
    setJoiningId(group.id);
    setError('');
    try {
      if (currentGroupId && localMembership?.id) {
        await base44.entities.GroupMember.delete(localMembership.id);
        setLocalMembership(null);
      }

      const isAutoApproved = group.is_system_group || group.type === 'independent';
      const newMember = await base44.entities.GroupMember.create({
        group_id: group.id,
        user_id: user.id,
        role: 'member',
        status: isAutoApproved ? 'approved' : 'pending',
        joined_date: new Date().toISOString(),
      });
      setLocalMembership(newMember);
      setJoinedGroup(group);
      setExpandedId(group.id);
    } catch (e) {
      setError(e.message || 'Failed to join group');
    }
    setJoiningId(null);
  }

  async function handleSwitchGroup() {
    if (onboardingComplete) return;
    setSwitching(true);
    try {
      if (localMembership?.id) {
        await base44.entities.GroupMember.delete(localMembership.id);
      }
      setLocalMembership(null);
      setJoinedGroup(null);
      setExpandedId(null);
    } catch (e) {
      setError(e.message);
    }
    setSwitching(false);
  }

  async function handleContinue() {
    setError('');
    setCompleting(true);
    try {
      await base44.functions.invoke('completeOnboarding', {});
      await onJoined();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to complete onboarding. Please ensure all steps are done.');
    }
    setCompleting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user?.county_id) {
    return (
      <div className="space-y-4">
        <div className="bg-accent rounded-2xl p-6 text-center">
          <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium mb-1">No county set</p>
          <p className="text-xs text-muted-foreground">Go back to Phase 1 and select your county to see available SACCOs.</p>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onBack} className="flex items-center justify-center px-5 py-3 rounded-xl border border-border text-sm font-semibold">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (currentGroupId && onboardingComplete && !joinedGroup) {
    return (
      <div className="space-y-4">
        {readOnly && <ReadOnlyBanner />}
        <div className={`bg-accent rounded-2xl p-6 text-center ${readOnly ? 'opacity-60 pointer-events-none' : ''}`}>
          <Shield className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium mb-1">You're a member of {currentGroup?.name || 'a group'}</p>
          <p className="text-xs text-muted-foreground">Contact support to change your group.</p>
        </div>
        {!readOnly && (
        <div className="flex gap-2 pt-2">
          <button onClick={onBack} className="flex items-center justify-center px-5 py-3 rounded-xl border border-border text-sm font-semibold">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={handleContinue} disabled={completing} className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
            {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
        )}
        {readOnly && <ReadOnlyBackButton onExit={onExitReadOnly} />}
      </div>
    );
  }

  const renderGroupCard = (group, keyPrefix = '') => {
    const isExpanded = expandedId === group.id;
    const isJoined = joinedGroup?.id === group.id;
    const isMuted = joinedGroup && !isJoined;
    const isJoining = joiningId === group.id;
    return (
      <GroupCard
        key={`${keyPrefix}${group.id}`}
        group={group}
        isExpanded={isExpanded}
        onToggle={() => handleCardToggle(group.id)}
        onSelect={() => setPendingGroup(group)}
        isJoined={isJoined}
        isMuted={isMuted}
        isJoining={isJoining}
      />
    );
  };

  const showSuggestedSection = hasWard && riderConstituency && suggestedSaccos.length > 0;

  return (
    <div className="space-y-4">
      {/* County banner */}
      {user.county_id && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-primary">{countyName} 📍</p>
            <p className="text-[10px] text-muted-foreground">SACCOs available in your county</p>
          </div>
        </div>
      )}

      {/* Currently joined — switch banner */}
      {canSwitch && currentGroup && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-700 font-medium">Currently: {currentGroup.name}</p>
            <p className="text-[10px] text-amber-600">You can switch before finishing setup</p>
          </div>
          <button onClick={handleSwitchGroup} disabled={switching} className="text-xs font-semibold text-amber-700 underline">
            {switching ? 'Switching...' : 'Switch Group'}
          </button>
        </div>
      )}

      {/* No ward info banner */}
      {!hasWard && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">Complete your stage mapping first for personalised suggestions — showing all for now.</p>
        </div>
      )}

      {/* Post-join continue CTA */}
      {joinedGroup && (
        <div className="bg-success/5 border border-success/20 rounded-xl p-4">
          <p className="text-sm font-semibold text-success mb-2">You've joined {joinedGroup.name}!</p>
          <button onClick={handleContinue} disabled={completing} className="w-full flex items-center justify-center gap-1 bg-success text-success-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
            {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue to Complete Setup <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      )}

      {/* Suggested for your area */}
      {showSuggestedSection && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-xs font-semibold text-amber-600">Suggested for your area</p>
          </div>
          <div className="space-y-2">
            {independentOperator && renderGroupCard(independentOperator, 'suggested-')}
            {suggestedSaccos.map(g => renderGroupCard(g, 'suggested-'))}
          </div>
        </div>
      )}

      {/* Full list or flat list */}
      {showSuggestedSection ? (
        <div>
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted rounded-xl text-sm font-medium"
          >
            <span>Show all {allSaccos.length} SACCOs in {countyName}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
          </button>
          {showAll && (
            <div className="mt-2 space-y-2">
              {independentOperator && renderGroupCard(independentOperator, 'all-')}
              {constituencyNames.map(conName => (
                <div key={conName} className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleConstituency(conName)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/50 text-sm font-medium"
                  >
                    <span>{conName}</span>
                    <span className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">{groupedByConstituency[conName].length}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openConstituencies.has(conName) ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {openConstituencies.has(conName) && (
                    <div className="p-2 space-y-2">
                      {groupedByConstituency[conName].map(g => renderGroupCard(g, 'all-'))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* No ward / no suggestions — show all flat */
        <div className="space-y-2">
          {independentOperator && renderGroupCard(independentOperator, 'flat-')}
          {allSaccos.map(g => renderGroupCard(g, 'flat-'))}
        </div>
      )}

      {error && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Back button */}
      <div className="flex gap-2 pt-2">
        <button onClick={onBack} className="flex items-center justify-center px-5 py-3 rounded-xl border border-border text-sm font-semibold">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Membership Value informational sheet — fires before confirmation */}
      <MembershipValueSheet
        group={pendingGroup}
        onContinue={() => { setConfirmGroup(pendingGroup); setPendingGroup(null); }}
        onClose={() => setPendingGroup(null)}
      />

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmGroup} onOpenChange={(open) => !open && setConfirmGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Join {confirmGroup?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {currentGroupId
                ? `Switching will remove you from ${currentGroup?.name} and add you to ${confirmGroup?.name}. This can only be changed during setup.`
                : `Are you sure? You can only change your group before finishing your setup. After that, changing requires contacting support.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmJoin}>
              Yes, Join {confirmGroup?.name}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
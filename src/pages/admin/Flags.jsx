import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldAlert, RotateCw, CheckCircle } from 'lucide-react';
import { timeAgo } from '@/lib/format';
import { similarity } from '@/lib/textUtils';
import { getCountyCenter, haversineKm } from '@/lib/countyBounds';
import IssueRow from '@/components/admin/flags/IssueRow';
import StageLocationDrawer from '@/components/admin/flags/StageLocationDrawer';
import DuplicateStageDrawer from '@/components/admin/flags/DuplicateStageDrawer';
import UserProfileDrawer from '@/components/admin/UserProfileDrawer';
import BikeDetailSheet from '@/components/BikeDetailSheet';
import { useToast } from '@/components/ui/use-toast';

const PLATE_REGEX = /^K[A-Z]{2}\s?\d{3}[A-Z]$/i;

const DOC_TYPE_LABELS = {
  id_front: 'ID (Front)',
  id_back: 'ID (Back)',
  selfie: 'Selfie',
  logbook: 'Logbook',
  owner_id: 'Owner ID',
  bike_front: 'Bike (Front)',
  bike_left: 'Bike (Left)',
  bike_rear: 'Bike (Rear)',
  bike_right: 'Bike (Right)',
};

const TABS = [
  { id: 'all', label: 'All', types: null },
  { id: 'kyc', label: 'KYC', types: ['kyc_pending', 'kyc_rejected'] },
  { id: 'vehicles', label: 'Vehicles', types: ['vehicle_pending', 'vehicle_rejected', 'vehicle_needs_review'] },
  { id: 'wallets', label: 'Wallets', types: ['unlinked', 'wallet_needs_review'] },
  { id: 'stages', label: 'Stage Location', types: ['location_flagged'] },
  { id: 'duplicates', label: 'Duplicates', types: ['duplicate'] },
  { id: 'plates', label: 'Plates', types: ['plate'] },
];

function unwrap(result, fallback = []) {
  return result.status === 'fulfilled' ? result.value : fallback;
}

export default function AdminFlags() {
  const { toast } = useToast();
  const [issues, setIssues] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [countyMap, setCountyMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [resolvedIds, setResolvedIds] = useState(new Set());
  const [dismissedDuplicates, setDismissedDuplicates] = useState([]);

  // Drawer states
  const [drawerUser, setDrawerUser] = useState(null);
  const [drawerWallet, setDrawerWallet] = useState(null);
  const [drawerTab, setDrawerTab] = useState('personal');
  const [drawerCountyName, setDrawerCountyName] = useState('');
  const [stageDrawerIssue, setStageDrawerIssue] = useState(null);
  const [duplicateDrawerIssue, setDuplicateDrawerIssue] = useState(null);
  const [bikeDetailId, setBikeDetailId] = useState(null);

  const loadFlags = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        base44.entities.KycDocument.filter({ status: { $in: ['pending', 'rejected'] } }),
        base44.entities.Vehicle.filter({ status: { $in: ['pending', 'rejected'] } }),
        base44.entities.Vehicle.filter({ needs_review: true }),
        base44.entities.Wallet.filter({ entity_type: 'personal' }),
        base44.entities.Stage.filter({ location_flagged: true }),
        base44.entities.Stage.filter({ needs_review: true }),
        base44.entities.Stage.list('-created_date', 500),
        base44.entities.Vehicle.list('-created_date', 500),
        base44.entities.County.list(),
      ]);

      const kycDocs = unwrap(results[0]);
      const vehiclesPending = unwrap(results[1]);
      const vehiclesReview = unwrap(results[2]);
      const personalWallets = unwrap(results[3]);
      const stagesFlagged = unwrap(results[4]);
      const stagesReview = unwrap(results[5]);
      const allStages = unwrap(results[6]);
      const allVehicles = unwrap(results[7]);
      const counties = unwrap(results[8]);

      // Build county map
      const cMap = {};
      counties.forEach((c) => {
        cMap[c.id] = c;
      });
      setCountyMap(cMap);

      // Deduplicate vehicles
      const vMap = {};
      [...vehiclesPending, ...vehiclesReview, ...allVehicles].forEach((v) => {
        vMap[v.id] = v;
      });

      // Deduplicate stages
      const sMap = {};
      [...stagesFlagged, ...stagesReview, ...allStages].forEach((s) => {
        sMap[s.id] = s;
      });

      // Deduplicate wallets
      const wMap = {};
      personalWallets.forEach((w) => {
        wMap[w.id] = w;
      });

      // Collect user IDs
      const userIds = new Set();
      kycDocs.forEach((d) => {
        if (d.user_id) userIds.add(d.user_id);
      });
      Object.values(vMap).forEach((v) => {
        if (v.rider_id) userIds.add(v.rider_id);
        if (v.owner_id) userIds.add(v.owner_id);
      });
      personalWallets.forEach((w) => {
        if (w.user_id) userIds.add(w.user_id);
      });

      // Batch fetch users
      const userIdsArr = [...userIds];
      let users = [];
      if (userIdsArr.length > 0) {
        try {
          users = await base44.entities.User.filter({ id: { $in: userIdsArr } });
        } catch {
          const userResults = await Promise.allSettled(
            userIdsArr.map((id) =>
              base44.entities.User.filter({ id }).then((r) => r[0])
            )
          );
          users = userResults
            .filter((r) => r.status === 'fulfilled' && r.value)
            .map((r) => r.value);
        }
      }
      const uMap = {};
      users.forEach((u) => {
        uMap[u.id] = u;
      });
      setUserMap(uMap);

      // Build issues array
      const newIssues = [];

      // KYC issues
      kycDocs.forEach((doc) => {
        const user = uMap[doc.user_id];
        newIssues.push({
          id: `kyc_${doc.id}`,
          type: doc.status === 'pending' ? 'kyc_pending' : 'kyc_rejected',
          severity: doc.status === 'rejected' ? 'error' : 'warning',
          entityId: doc.id,
          entityName: DOC_TYPE_LABELS[doc.document_type] || doc.document_type,
          riderName: user?.full_name || 'Unknown',
          riderId: doc.user_id || '',
          description:
            doc.status === 'rejected'
              ? `Rejected: ${doc.rejection_reason || 'No reason given'}`
              : 'Awaiting review',
          createdAt: doc.created_date,
          rawData: { doc, user },
        });
      });

      // Vehicle issues
      Object.values(vMap).forEach((v) => {
        const user = uMap[v.rider_id] || uMap[v.owner_id];
        if (v.status === 'pending' || v.status === 'rejected') {
          newIssues.push({
            id: `vehicle_${v.id}_${v.status}`,
            type: v.status === 'pending' ? 'vehicle_pending' : 'vehicle_rejected',
            severity: v.status === 'rejected' ? 'error' : 'warning',
            entityId: v.id,
            entityName: v.plate_number,
            riderName: user?.full_name || 'Unknown',
            riderId: v.rider_id || v.owner_id || '',
            description:
              v.status === 'rejected'
                ? `Rejected: ${v.rejection_reason || 'No reason'}`
                : 'Awaiting approval',
            createdAt: v.created_date,
            rawData: { vehicle: v, user },
          });
        }
        if (v.needs_review === true) {
          newIssues.push({
            id: `vehicle_review_${v.id}`,
            type: 'vehicle_needs_review',
            severity: 'warning',
            entityId: v.id,
            entityName: v.plate_number,
            riderName: user?.full_name || 'Unknown',
            riderId: v.rider_id || v.owner_id || '',
            description: 'Flagged for review',
            createdAt: v.created_date,
            rawData: { vehicle: v, user },
          });
        }
        // Plate format check
        if (v.plate_number && !PLATE_REGEX.test(v.plate_number)) {
          newIssues.push({
            id: `plate_${v.id}`,
            type: 'plate',
            severity: 'warning',
            entityId: v.id,
            entityName: v.plate_number,
            riderName: user?.full_name || 'Unknown',
            riderId: v.rider_id || v.owner_id || '',
            description: `Invalid plate format: "${v.plate_number}"`,
            createdAt: v.created_date,
            rawData: { vehicle: v, user },
          });
        }
      });

      // Wallet issues
      Object.values(wMap).forEach((w) => {
        const user = uMap[w.user_id];
        if (!w.sasapay_account_number) {
          newIssues.push({
            id: `wallet_unlinked_${w.id}`,
            type: 'unlinked',
            severity: 'warning',
            entityId: w.id,
            entityName: user?.full_name || 'Unknown User',
            riderName: user?.full_name || 'Unknown',
            riderId: w.user_id || '',
            description: 'Wallet not linked to BodaSure Wallet',
            createdAt: w.created_date,
            rawData: { wallet: w, user },
          });
        }
        if (w.needs_review === true) {
          newIssues.push({
            id: `wallet_review_${w.id}`,
            type: 'wallet_needs_review',
            severity: 'warning',
            entityId: w.id,
            entityName: user?.full_name || 'Unknown User',
            riderName: user?.full_name || 'Unknown',
            riderId: w.user_id || '',
            description: 'Wallet flagged for review',
            createdAt: w.created_date,
            rawData: { wallet: w, user },
          });
        }
      });

      // Stage location issues
      Object.values(sMap).forEach((s) => {
        const county = cMap[s.county_id];
        const cName = county?.name || '';
        const center = getCountyCenter(cName);
        const hasCoords = s.location_lat != null && s.location_lng != null;
        const dist = hasCoords
          ? haversineKm(s.location_lat, s.location_lng, center[1], center[0])
          : 0;
        const isLocationFlagged = s.location_flagged === true;
        const isNeedsReview = s.needs_review === true;
        const isDistanceAnomaly = hasCoords && dist > 25;

        if (isLocationFlagged || isNeedsReview || isDistanceAnomaly) {
          let description;
          if (isNeedsReview) {
            description = 'Flagged for rider to re-select location';
          } else if (isLocationFlagged) {
            description = `Location anomaly in ${cName || 'unknown county'}`;
          } else {
            description = `${Math.round(dist)} km from ${cName || 'county'} centre`;
          }
          newIssues.push({
            id: `stage_loc_${s.id}`,
            type: 'location_flagged',
            severity: 'warning',
            entityId: s.id,
            entityName: s.name,
            riderName: '—',
            riderId: s.leader_id || '',
            description,
            createdAt: s.created_date,
            rawData: { stage: s, countyName: cName, distance: dist },
          });
        }
      });

      // Duplicate stage detection
      const stageList = Object.values(sMap).filter((s) => s.name && s.county_id);
      const seenPairs = new Set();
      for (let i = 0; i < stageList.length; i++) {
        for (let j = i + 1; j < stageList.length; j++) {
          const a = stageList[i];
          const b = stageList[j];
          if (a.county_id !== b.county_id) continue;
          const sim = similarity(a.name.toLowerCase(), b.name.toLowerCase());
          if (sim > 0.8) {
            const pairKey = [a.id, b.id].sort().join('_');
            if (seenPairs.has(pairKey)) continue;
            seenPairs.add(pairKey);
            newIssues.push({
              id: `dup_${pairKey}`,
              type: 'duplicate',
              severity: 'warning',
              entityId: a.id,
              entityName: a.name,
              riderName: '—',
              riderId: '',
              description: `Similar to "${b.name}"`,
              createdAt: a.created_date,
              rawData: { stageA: a, stageB: b },
            });
          }
        }
      }

      setIssues(newIssues);
      sessionStorage.setItem('bodasure_flags_count', String(newIssues.length));
    } catch (e) {
      toast({ title: 'Failed to load flags', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  // Compute visible issues (excluding resolved + dismissed duplicates)
  const visibleIssues = useMemo(() => {
    return issues.filter((i) => {
      if (resolvedIds.has(i.id)) return false;
      if (i.type === 'duplicate') {
        const { stageA, stageB } = i.rawData;
        return !dismissedDuplicates.some(
          ([idA, idB]) =>
            (idA === stageA.id && idB === stageB.id) ||
            (idA === stageB.id && idB === stageA.id)
        );
      }
      return true;
    });
  }, [issues, resolvedIds, dismissedDuplicates]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = {};
    TABS.forEach((tab) => {
      if (tab.types === null) {
        counts[tab.id] = visibleIssues.length;
      } else {
        counts[tab.id] = visibleIssues.filter((i) => tab.types.includes(i.type)).length;
      }
    });
    return counts;
  }, [visibleIssues]);

  // Filtered issues for active tab
  const filteredIssues = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab);
    if (!tab || tab.types === null) return visibleIssues;
    return visibleIssues.filter((i) => tab.types.includes(i.type));
  }, [visibleIssues, activeTab]);

  function resolve(issueId) {
    setResolvedIds((prev) => new Set([...prev, issueId]));
  }

  async function handleAction(action, params) {
    const { issue } = params;
    try {
      if (action === 'approveKyc') {
        await base44.functions.invoke('processKycDecisionV2', {
          documentId: issue.rawData.doc.id,
          decision: 'approve',
        });
        toast({ title: 'KYC approved' });
        resolve(issue.id);
        return true;
      } else if (action === 'rejectKyc') {
        await base44.functions.invoke('processKycDecisionV2', {
          documentId: issue.rawData.doc.id,
          decision: 'reject',
          rejectionReason: params.rejectionReason,
        });
        toast({ title: 'KYC rejected' });
        resolve(issue.id);
        return true;
      } else if (action === 'approveVehicle') {
        const me = await base44.auth.me();
        await base44.entities.Vehicle.update(issue.entityId, {
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by_id: me.id,
        });
        toast({ title: 'Vehicle approved' });
        resolve(issue.id);
        return true;
      } else if (action === 'rejectVehicle') {
        await base44.entities.Vehicle.update(issue.entityId, {
          status: 'rejected',
          rejection_reason: 'Did not meet requirements',
        });
        toast({ title: 'Vehicle rejected' });
        resolve(issue.id);
        return true;
      } else if (action === 'linkSasapay') {
        const res = await base44.functions.invoke('adminLinkSasapayAccount', {
          userId: issue.riderId,
        });
        if (res.data?.success) {
          toast({
            title: 'BodaSure Wallet linked',
            description: `Account ${res.data.accountNumber}`,
          });
          resolve(issue.id);
          return true;
        } else {
          toast({
            title: 'Link failed',
            description: res.data?.message || 'No account found for this phone.',
            variant: 'destructive',
          });
          return false;
        }
      } else if (action === 'editPlate') {
        await base44.entities.Vehicle.update(issue.entityId, {
          plate_number: params.newPlate,
        });
        toast({ title: 'Plate updated', description: params.newPlate });
        resolve(issue.id);
        return true;
      } else if (action === 'flagVehicleForRider') {
        await base44.entities.Vehicle.update(issue.entityId, {
          needs_review: true,
        });
        toast({ title: 'Flagged for rider' });
        resolve(issue.id);
        return true;
      }
    } catch (e) {
      toast({ title: 'Action failed', description: e.message, variant: 'destructive' });
      return false;
    }
  }

  async function openUserDrawer(issue, tab) {
    const user = issue.rawData?.user || userMap[issue.riderId];
    if (!user) return;
    setDrawerUser(user);
    setDrawerTab(tab);
    setDrawerCountyName(countyMap[user.county_id]?.name || '');
    try {
      const wallets = await base44.entities.Wallet.filter({
        user_id: user.id,
        entity_type: 'personal',
      });
      setDrawerWallet(wallets.length > 0 ? wallets[0] : null);
    } catch {
      setDrawerWallet(null);
    }
  }

  function handleOpenDrawer(issue) {
    if (issue.type === 'kyc_rejected') {
      openUserDrawer(issue, 'kyc');
    } else if (issue.type === 'vehicle_rejected' || issue.type === 'vehicle_needs_review') {
      setBikeDetailId(issue.entityId);
    } else if (issue.type === 'wallet_needs_review') {
      openUserDrawer(issue, 'wallet');
    } else if (issue.type === 'location_flagged') {
      setStageDrawerIssue(issue);
    } else if (issue.type === 'duplicate') {
      setDuplicateDrawerIssue(issue);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            Flags
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading
              ? 'Loading...'
              : `${visibleIssues.length} open item${visibleIssues.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={loadFlags}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Tab pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-primary-foreground/20' : 'bg-muted'
              }`}
            >
              {tabCounts[tab.id] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Issue list */}
      <div className="space-y-2">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))
        ) : filteredIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle className="w-12 h-12 text-success/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No{' '}
              {activeTab === 'all'
                ? ''
                : TABS.find((t) => t.id === activeTab)?.label.toLowerCase() + ' '}
              flags — all clear!
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              isResolved={resolvedIds.has(issue.id)}
              onAction={handleAction}
              onOpenDrawer={handleOpenDrawer}
              onOpenUserDrawer={(iss) => openUserDrawer(iss, 'personal')}
            />
          ))
        )}
      </div>

      {/* Drawers */}
      <UserProfileDrawer
        open={!!drawerUser}
        onOpenChange={(v) => !v && setDrawerUser(null)}
        user={drawerUser}
        wallet={drawerWallet}
        snapshot={null}
        countyName={drawerCountyName}
        defaultTab={drawerTab}
        onLinked={() => loadFlags()}
      />
      <StageLocationDrawer
        open={!!stageDrawerIssue}
        onOpenChange={(v) => !v && setStageDrawerIssue(null)}
        stage={stageDrawerIssue?.rawData?.stage}
        countyName={stageDrawerIssue?.rawData?.countyName}
        distance={stageDrawerIssue?.rawData?.distance || 0}
        onResolved={() => {
          if (stageDrawerIssue) resolve(stageDrawerIssue.id);
          setStageDrawerIssue(null);
        }}
      />
      <DuplicateStageDrawer
        open={!!duplicateDrawerIssue}
        onOpenChange={(v) => !v && setDuplicateDrawerIssue(null)}
        stageA={duplicateDrawerIssue?.rawData?.stageA}
        stageB={duplicateDrawerIssue?.rawData?.stageB}
        onMerged={() => {
          if (duplicateDrawerIssue) resolve(duplicateDrawerIssue.id);
          setDuplicateDrawerIssue(null);
        }}
        onDismiss={(idA, idB) => {
          setDismissedDuplicates((prev) => [...prev, [idA, idB]]);
          setDuplicateDrawerIssue(null);
        }}
      />
      {bikeDetailId && (
        <BikeDetailSheet
          vehicleId={bikeDetailId}
          onClose={() => setBikeDetailId(null)}
          isStaff={true}
          accent="orange"
        />
      )}
    </div>
  );
}
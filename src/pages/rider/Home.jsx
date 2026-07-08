// Home orchestrator: data loading + state management, delegates rendering to sub-components
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageSkeleton from '@/components/rider/PageSkeleton';
import { useToast } from '@/components/ui/use-toast';
import HomeHero from '@/components/rider/home/HomeHero';
import HomeStatusBanners from '@/components/rider/home/HomeStatusBanners';
import HomeOwnerActions from '@/components/rider/home/HomeOwnerActions';
import HomeNavGrid from '@/components/rider/home/HomeNavGrid';
import OnboardingWizardModal from '@/components/rider/onboarding/OnboardingWizardModal';
import OnboardingFAB from '@/components/rider/onboarding/OnboardingFAB';
import { getOnboardingPhase } from '@/lib/onboarding';

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [walletActive, setWalletActive] = useState(false);
  const [bikes, setBikes] = useState([]);
  const [kycDocs, setKycDocs] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState(null);
  const [ownerBikes, setOwnerBikes] = useState([]);
  const [pendingSacco, setPendingSacco] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lockedTile, setLockedTile] = useState(null);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [prevKycStatus, setPrevKycStatus] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStartScreen, setWizardStartScreen] = useState(0);
  const [phase, setPhase] = useState(null);

  // Check for Tier 2 celebration on mount and when kyc_status changes
  useEffect(() => {
    if (!user?.kyc_status) return;

    if (user.kyc_status === 'verified' && prevKycStatus !== 'verified') {
      const sessionKey = `tier2_celebrated_${user.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        toast({
          title: "You're now Tier 2 Verified! 🎉",
          description: 'Lipa Owner, Contributions & Insurance are now unlocked.',
        });
        sessionStorage.setItem(sessionKey, 'true');
      }
    }
    setPrevKycStatus(user.kyc_status);
  }, [user?.kyc_status, user?.id, prevKycStatus, toast]);

  useEffect(() => {
    let unsub;
    let timeoutId;
    async function loadData() {
      if (!user) { setLoading(false); return; }
      timeoutId = setTimeout(() => setLoading(false), 8000);
      try {
        const wallets = await base44.entities.Wallet.filter({ user_id: user.id, entity_type: 'personal' });
        const snapshotPromise = wallets.length > 0
          ? base44.entities.WalletSnapshot.filter({ wallet_id: wallets[0].id })
          : Promise.resolve([]);

        const [owned, ridden, kyc, gms, snapshots, ownerBikesRaw, announcements] = await Promise.all([
          base44.entities.Vehicle.filter({ owner_id: user.id }),
          base44.entities.Vehicle.filter({ rider_id: user.id }),
          base44.entities.KycDocument.filter({ user_id: user.id }),
          base44.entities.GroupMember.filter({ user_id: user.id }),
          snapshotPromise,
          user.phone
            ? base44.entities.Vehicle.filter({ owner_phone: user.phone, owner_verified: false }).catch(() => [])
            : Promise.resolve([]),
          base44.entities.Announcement.filter({ status: 'published' }, '-created_date', 10).catch(() => []),
        ]);

        if (user.pending_group_id) {
          const pending = await base44.entities.Group.get(user.pending_group_id).catch(() => null);
          if (pending && pending.status === 'pending') setPendingSacco(pending);
        }
        if (user.group_rejection_reason) {
          setPendingSacco({ name: 'Your SACCO Application', status: 'rejected', description: user.group_rejection_reason });
        }

        if (wallets.length > 0) {
          setWallet(wallets[0]);
          setWalletActive(wallets[0].status === 'active' || wallets[0].tier > 0);
          if (snapshots.length > 0) setBalance(snapshots[0].balance_cents || 0);
          unsub = base44.entities.Wallet.subscribe((event) => {
            if (event.id === wallets[0].id) {
              setWalletActive(event.data?.status === 'active' || event.data?.tier > 0);
              setWallet(prev => ({ ...prev, ...event.data }));
            }
          });
        }

        const merged = [...owned, ...ridden.filter(r => !owned.find(o => o.id === r.id))];
        setBikes(merged);
        setKycDocs(kyc);
        setGroupMembers(gms);
        setOwnerBikes(ownerBikesRaw.filter(b => !b.is_owner_rider));

        const riderCounty = user?.county_id;
        const visible = announcements.filter(a => {
          const audienceOk = a.audience === 'all' || a.audience === 'riders';
          const countyOk = !a.county_id || a.county_id === riderCounty;
          return audienceOk && countyOk;
        });
        const nonWelcome = visible.filter(a => !a.title?.toLowerCase().includes('welcome to bodasure'));
        if (nonWelcome.length > 0) setLatestAnnouncement(nonWelcome[0]);

        // Compute phase from local variables (not stale state) to avoid race condition
        const _phase = getOnboardingPhase(user, merged, gms, wallets[0] ?? null);
        setPhase(_phase);
        if (_phase < 4) {
          const seenKey = `bodasure_wizard_seen_${user.id}`;
          if (!localStorage.getItem(seenKey)) {
            setWizardStartScreen(0);
            setWizardOpen(true);
            localStorage.setItem(seenKey, 'true');
          }
        }
      } catch (e) {}
      clearTimeout(timeoutId);
      setLoading(false);
    }
    loadData();
    return () => { unsub?.(); clearTimeout(timeoutId); };
  }, [user, user?.session_invalidated_at]);

  if (loading) return <PageSkeleton variant="hero-grid" />;

  return (
    <div className="animate-fade-in">
      <HomeHero user={user} balance={balance} walletActive={walletActive} bikes={bikes} />
      <HomeOwnerActions user={user} bikes={bikes} ownerBikes={ownerBikes} setOwnerBikes={setOwnerBikes} pendingSacco={pendingSacco} />
      <HomeStatusBanners
        user={user}
        bikes={bikes}
        kycDocs={kycDocs}
        groupMembers={groupMembers}
        wallet={wallet}
        latestAnnouncement={latestAnnouncement}
        bannerDismissed={bannerDismissed}
        setBannerDismissed={setBannerDismissed}
      />
      <HomeNavGrid
        user={user}
        walletActive={walletActive}
        lockedTile={lockedTile}
        setLockedTile={setLockedTile}
        servicesExpanded={servicesExpanded}
        setServicesExpanded={setServicesExpanded}
      />
      {phase !== null && phase < 4 && (
        <OnboardingWizardModal
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          user={user}
          bikes={bikes}
          groupMembers={groupMembers}
          wallet={wallet}
          startScreen={wizardStartScreen}
        />
      )}
      {phase !== null && phase < 4 && (
        <OnboardingFAB
          phase={phase}
          userId={user?.id}
          onOpen={() => { setWizardStartScreen(1); setWizardOpen(true); }}
        />
      )}
    </div>
  );
}
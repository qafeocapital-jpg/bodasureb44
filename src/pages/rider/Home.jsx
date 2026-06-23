import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { riderTileSections, tileColors } from '@/lib/riderTiles';
import { formatKES, getGreeting } from '@/lib/format';
import { ShieldCheck, AlertCircle, Megaphone, X, Check, HelpCircle, Bike, UserCircle, ChevronRight, ArrowRight, Lock } from 'lucide-react';
import { formatPlate } from '@/lib/plate';
import OnboardingTiles from '@/components/rider/OnboardingTiles';
import { getOnboardingPhase } from '@/lib/onboarding';
import { getKycLevel, KYC_LEVEL_CONFIG } from '@/components/ui/KycLevelBadge';
import PageSkeleton from '@/components/rider/PageSkeleton';
import { getTaskStatuses } from '@/lib/verification';
import LockedTileSheet from '@/components/rider/LockedTileSheet';
import { useToast } from '@/components/ui/use-toast';

export default function Home() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [walletActive, setWalletActive] = useState(false);
  const [bikes, setBikes] = useState([]);
  const [kycDocs, setKycDocs] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState(null);
  const [ownerBikes, setOwnerBikes] = useState([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lockedTile, setLockedTile] = useState(null);
  const [prevKycStatus, setPrevKycStatus] = useState(null);

  // Check for Tier 2 celebration on mount and when kyc_status changes
  useEffect(() => {
    if (!user?.kyc_status) return;
    
    // Show toast if kyc_status just became 'verified'
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
    async function loadData() {
      if (!user) return;
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

        if (wallets.length > 0) {
          setWalletActive(wallets[0].status === 'active' || wallets[0].tier > 0);
          if (snapshots.length > 0) setBalance(snapshots[0].balance_cents || 0);
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
        if (visible.length > 0) setLatestAnnouncement(visible[0]);
      } catch (e) {}
      setLoading(false);
    }
    loadData();
  }, [user]);

  if (loading) return <PageSkeleton variant="hero-grid" />;

  return (
    <div className="animate-fade-in">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-primary to-orange-600 text-primary-foreground px-5 pt-6 pb-8 rounded-b-3xl">
        <p className="text-sm text-orange-100 font-medium">
          {getGreeting()}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
        </p>
        <div className="mt-4">
          <p className="text-xs text-orange-100 uppercase tracking-wide font-medium">Wallet Balance</p>
          <p className="text-3xl font-heading font-extrabold mt-0.5">{formatKES(balance)}</p>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
            <Bike className="w-3.5 h-3.5" />
            <span className={`text-xs font-medium ${bikes[0] ? '' : 'text-orange-100/60'}`}>
              {bikes[0] ? formatPlate(bikes[0].plate_number) : 'No bike yet'}
            </span>
          </div>
          {(() => {
            const bike = bikes[0];
            let roleLabel = null;
            if (bike?.is_owner_rider) roleLabel = 'Owner & Rider';
            else if (bike && bike.rider_id === user.id && bike.owner_id !== user.id) roleLabel = 'Rider';
            else if (bike && bike.owner_id === user.id && bike.rider_id !== user.id) roleLabel = 'Owner';
            else if (!bike) roleLabel = 'Unregistered';
            if (!roleLabel) return null;
            return (
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
                <UserCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{roleLabel}</span>
              </div>
            );
          })()}
        </div>
        <div className="flex items-center gap-2 mt-4">
          {walletActive ? (
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-medium">Wallet Active · {KYC_LEVEL_CONFIG[getKycLevel(user)].label}</span>
            </div>
          ) : (
            <Link to="/app/wallet/activate" className="flex items-center gap-1.5 bg-white text-primary rounded-full px-3 py-1.5 font-semibold text-xs hover:bg-orange-50 transition-colors">
              <AlertCircle className="w-4 h-4" />
              Activate Wallet
            </Link>
          )}
        </div>
        {walletActive && (
          <div className="flex gap-2 mt-3">
            <Link to="/app/lipisha" className="flex-1 bg-white text-primary rounded-xl py-2.5 font-semibold text-xs text-center hover:bg-orange-50 transition-colors">
              Collect Fare
            </Link>
            <Link to="/app/lipa-county" className="flex-1 bg-white/15 backdrop-blur-sm text-primary-foreground rounded-xl py-2.5 font-semibold text-xs text-center hover:bg-white/25 transition-colors">
              Pay County
            </Link>
          </div>
        )}
      </div>

      {/* Onboarding Progress Tiles */}
      <div className="px-4 pt-5">
        {user && <OnboardingTiles user={user} bikes={bikes} kycDocs={kycDocs} groupMembers={groupMembers} />}
      </div>

      {/* Verification Nudge Banner */}
      {user?.onboarding_complete && !user?.verification_complete && !bannerDismissed && (() => {
        const tasks = getTaskStatuses(kycDocs, user, bikes[0]);
        const doneCount = tasks.filter(t => t.status === 'submitted' || t.status === 'verified').length;
        const totalTasks = tasks.length;
        return (
          <div className="px-4 pt-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{doneCount}/{totalTasks}</span>
                </div>
                <Link to="/app/profile" className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">Complete Verification</p>
                  <p className="text-[10px] text-muted-foreground">{doneCount} of {totalTasks} verification tasks complete</p>
                </Link>
                <button onClick={() => setBannerDismissed(true)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-end mt-3">
                <Link to="/app/profile" className="bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-xs font-semibold animate-pulse-glow flex items-center gap-1">
                  Continue <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Owner Verify My Bike Section */}
      {ownerBikes.length > 0 && (
        <div className="px-4 pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-5 h-5 text-amber-600" />
              <p className="text-sm font-semibold text-amber-700">Verify Your Bike</p>
            </div>
            <p className="text-[10px] text-amber-600 mb-3">
              A rider has registered {ownerBikes.length === 1 ? 'a bike' : `${ownerBikes.length} bikes`} with you as the owner. Please confirm ownership.
            </p>
            <div className="space-y-2">
              {ownerBikes.map(bike => (
                <div key={bike.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{bike.plate_number}</p>
                    <p className="text-[10px] text-muted-foreground">{bike.make} · {bike.color}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={async () => {
                        await base44.entities.Vehicle.update(bike.id, { owner_verified: true });
                        setOwnerBikes(prev => prev.filter(b => b.id !== bike.id));
                      }}
                      className="flex items-center gap-1 bg-success text-white rounded-lg px-3 py-1.5 text-xs font-semibold"
                    >
                      <Check className="w-3 h-3" /> Confirm
                    </button>
                    <a
                      href="mailto:support@bodasure.com"
                      className="flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-1.5 text-xs font-semibold"
                    >
                      Dispute
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Latest Announcement Banner */}
      {latestAnnouncement && (
        <div className="px-4 pt-4">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
            <Megaphone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">{latestAnnouncement.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{latestAnnouncement.body}</p>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Banner */}
      {getOnboardingPhase(user, bikes, groupMembers) < 5 && (
        <div className="px-4 pt-5">
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-warning">Complete your profile</p>
                <p className="text-xs text-muted-foreground">Finish your setup to unlock all features</p>
              </div>
              <Link to="/app/profile" className="bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-xs font-semibold animate-pulse-glow flex items-center gap-1 flex-shrink-0">
                Start Now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Locked Tile Sheet */}
      {lockedTile && (
        <LockedTileSheet
          open={!!lockedTile}
          onClose={() => setLockedTile(null)}
          tileLabel={lockedTile.label}
          featureDescription={{
            'Pay Owner': 'Pay bike owners directly for use and rental.',
            'Contributions': 'Join group savings and SACCO contributions.',
            'Insurance': 'Protect yourself with comprehensive coverage.',
          }[lockedTile.label] || 'This feature requires Tier 2 verification.'}
        />
      )}

      {/* Icon Grid Sections */}
      <div className="px-4 py-5 space-y-7">
        {user && riderTileSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-heading font-bold text-foreground mb-3 px-1">{section.title}</h2>
            <div className="grid grid-cols-4 gap-3">
              {section.tiles.map((tile) => {
                const Icon = tile.icon;
                const isSoon = tile.status === 'soon';
                const isLocked = tile.requiresTier2 && getKycLevel(user) < 2;
                const TileElement = isSoon || isLocked ? 'div' : Link;

                const tileConfig = {
                  to: isSoon || isLocked ? undefined : tile.path,
                  onClick: isLocked ? () => setLockedTile(tile) : undefined,
                  className: `flex flex-col items-center gap-1.5 ${(isSoon || isLocked) ? 'cursor-pointer' : 'cursor-pointer'}`,
                };

                

                return (
                  <TileElement key={tile.label} {...tileConfig}>
                    <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-150 ease-out ${
                      isLocked ? 'bg-slate-100 text-slate-400 active:scale-110' : 
                      isSoon ? 'bg-slate-100 text-slate-400 active:scale-110' : 
                      `${tileColors[tile.color]} active:scale-110`
                    }`}>
                      <Icon className="w-6 h-6" strokeWidth={2} />
                      {isLocked && (
                        <span className="absolute -top-2 -right-2 bg-orange-600 text-white rounded-full p-1">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                      {isSoon && (
                        <span className="absolute -top-1 -right-1 bg-amber-400 text-[8px] font-bold text-amber-950 rounded-full px-1.5 py-0.5 leading-none">
                          SOON
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] text-center font-medium leading-tight ${isLocked || isSoon ? 'text-slate-400' : 'text-foreground'}`}>
                      {tile.label}
                    </span>
                  </TileElement>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
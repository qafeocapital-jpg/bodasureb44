import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { riderTileSections, tileColors } from '@/lib/riderTiles';
import { formatKES, getGreeting } from '@/lib/format';
import { ShieldCheck, AlertCircle, Megaphone, X, Check, HelpCircle } from 'lucide-react';
import OnboardingTiles from '@/components/rider/OnboardingTiles';
import { getOnboardingPhase } from '@/lib/onboarding';
import { getKycLevel } from '@/components/ui/KycLevelBadge';
import PageSkeleton from '@/components/rider/PageSkeleton';
import { getTaskStatuses } from '@/lib/verification';

export default function Home() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [walletActive, setWalletActive] = useState(false);
  const [bikes, setBikes] = useState([]);
  const [kycDocs, setKycDocs] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState(null);
  const [ownerBikes, setOwnerBikes] = useState([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const wallets = await base44.entities.Wallet.filter({ user_id: user.id, entity_type: 'personal' });
        if (wallets.length > 0) {
          const w = wallets[0];
          setWalletActive(w.status === 'active' || w.tier > 0);
          const snapshots = await base44.entities.WalletSnapshot.filter({ wallet_id: w.id });
          if (snapshots.length > 0) setBalance(snapshots[0].balance_cents || 0);
        }
        const [owned, ridden, kyc, gms] = await Promise.all([
          base44.entities.Vehicle.filter({ owner_id: user.id }),
          base44.entities.Vehicle.filter({ rider_id: user.id }),
          base44.entities.KycDocument.filter({ user_id: user.id }),
          base44.entities.GroupMember.filter({ user_id: user.id }),
        ]);
        const merged = [...owned, ...ridden.filter(r => !owned.find(o => o.id === r.id))];
        setBikes(merged);
        setKycDocs(kyc);
        setGroupMembers(gms);
        // Fetch bikes where user is the owner (by phone) but hasn't verified yet
        if (user.phone) {
          try {
            const ob = await base44.entities.Vehicle.filter({ owner_phone: user.phone, owner_verified: false });
            setOwnerBikes(ob.filter(b => !b.is_owner_rider));
          } catch (e) {}
        }
        // Fetch latest published announcement for riders
        try {
          const announcements = await base44.entities.Announcement.filter({ status: 'published' }, '-created_date', 10);
          const riderCounty = user?.county_id;
          const visible = announcements.filter(a => {
            const audienceOk = a.audience === 'all' || a.audience === 'riders';
            const countyOk = !a.county_id || a.county_id === riderCounty;
            return audienceOk && countyOk;
          });
          if (visible.length > 0) setLatestAnnouncement(visible[0]);
        } catch (e) {}
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
        <div className="flex items-center gap-2 mt-4">
          {walletActive ? (
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-medium">Wallet Active · Level {getKycLevel(user)}</span>
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
        return (
          <div className="px-4 pt-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">{doneCount}/5</span>
              </div>
              <Link to="/app/profile" className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary">Complete Verification</p>
                <p className="text-[10px] text-muted-foreground">{doneCount} of 5 verification tasks complete</p>
              </Link>
              <button onClick={() => setBannerDismissed(true)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
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
          <Link to="/app/profile" className="block bg-warning/10 border border-warning/20 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-warning">Complete your profile</p>
                <p className="text-xs text-muted-foreground">Finish your setup to unlock all features</p>
              </div>
            </div>
          </Link>
        </div>
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
                const TileLink = isSoon ? 'div' : Link;
                return (
                  <TileLink
                    key={tile.label}
                    to={isSoon ? undefined : tile.path}
                    className={`flex flex-col items-center gap-1.5 ${isSoon ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center ${isSoon ? 'bg-slate-100' : tileColors[tile.color]} transition-transform active:scale-95`}>
                      <Icon className="w-6 h-6" strokeWidth={2} />
                      {isSoon && (
                        <span className="absolute -top-1 -right-1 bg-amber-400 text-[8px] font-bold text-amber-950 rounded-full px-1.5 py-0.5 leading-none">
                          SOON
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] text-center font-medium leading-tight ${isSoon ? 'text-slate-400' : 'text-foreground'}`}>
                      {tile.label}
                    </span>
                  </TileLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
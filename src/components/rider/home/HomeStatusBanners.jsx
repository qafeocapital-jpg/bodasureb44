// Status banners: onboarding progress, verification nudge, announcements, notifications
import { Link } from 'react-router-dom';
import { Megaphone, X, ChevronRight, ArrowRight, AlertCircle } from 'lucide-react';
import OnboardingTiles from '@/components/rider/OnboardingTiles';
import { getOnboardingPhase } from '@/lib/onboarding';
import { getTaskStatuses } from '@/lib/verification';

export default function HomeStatusBanners({ user, bikes, kycDocs, groupMembers, latestAnnouncement, bannerDismissed, setBannerDismissed }) {
  const phase = getOnboardingPhase(user, bikes, groupMembers);
  
  return (
    <>
      {/* Onboarding Progress Tiles - hidden for fully verified riders (phase >= 5) */}
      {phase < 5 && (
        <div className="px-4 pt-5">
          {user && <OnboardingTiles user={user} bikes={bikes} kycDocs={kycDocs} groupMembers={groupMembers} />}
        </div>
      )}

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

      {/* Notifications Banner - hidden for fully verified riders (phase >= 5) */}
      {phase < 5 && (
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
    </>
  );
}
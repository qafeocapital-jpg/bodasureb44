// Status banners: account verification section + announcements
import { Megaphone } from 'lucide-react';
import AccountVerificationSection from '@/components/rider/home/AccountVerificationSection';

export default function HomeStatusBanners({ user, bikes, kycDocs, groupMembers, wallet, latestAnnouncement }) {
  return (
    <>
      {/* Account Verification section (hidden for fully verified riders) */}
      <AccountVerificationSection
        user={user}
        bikes={bikes}
        kycDocs={kycDocs}
        groupMembers={groupMembers}
        wallet={wallet}
      />

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
    </>
  );
}
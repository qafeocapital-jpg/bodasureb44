import { Link } from 'react-router-dom';
import { User, Bike, FileCheck, BadgeCheck, Award, CheckCircle2, Clock, Lock } from 'lucide-react';

export default function OnboardingTiles({ user, bikes, kycDocs }) {
  const hasProfile = user?.profile_complete;
  const hasBike = bikes.length > 0;
  const hasDocs = kycDocs.length > 0;
  const hasApprovedBike = bikes.some(b => b.status === 'approved');
  const kycApproved = user?.kyc_status === 'approved';

  const tiles = [
    { label: 'Profile', icon: User, done: hasProfile, link: '/app/profile', color: 'bg-orange-50 text-orange-600' },
    { label: 'Vehicle', icon: Bike, done: hasBike, link: '/app/bikes/register', color: 'bg-blue-50 text-blue-600' },
    { label: 'Documents', icon: FileCheck, done: hasDocs, pending: kycDocs.some(d => d.status === 'pending'), link: '/app/kyc', color: 'bg-violet-50 text-violet-600' },
    { label: 'Approvals', icon: BadgeCheck, done: hasApprovedBike && kycApproved, pending: hasBike && !hasApprovedBike, link: '/app/compliance', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Leadership', icon: Award, done: false, link: '/app/account', color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-heading font-bold text-foreground">Complete Your Setup</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.label}
              to={tile.link}
              className="flex-shrink-0 w-28 bg-card border border-border rounded-xl p-3 hover:bg-accent transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tile.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {tile.done ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : tile.pending ? (
                  <Clock className="w-4 h-4 text-warning" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs font-semibold">{tile.label}</p>
              <p className={`text-[10px] ${tile.done ? 'text-success' : tile.pending ? 'text-warning' : 'text-muted-foreground'}`}>
                {tile.done ? 'Complete' : tile.pending ? 'Pending' : 'In progress'}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
// Gradient hero card with wallet balance, bike status, and quick actions
import { Link } from 'react-router-dom';
import { formatKES, getGreeting } from '@/lib/format';
import { formatPlate } from '@/lib/plate';
import { KYC_LEVEL_CONFIG, getKycLevel } from '@/components/ui/KycLevelBadge';
import { Bike, UserCircle, ShieldCheck, AlertCircle } from 'lucide-react';

export default function HomeHero({ user, balance, walletActive, bikes }) {
  return (
    <div className="bg-gradient-to-br from-primary to-orange-600 text-primary-foreground px-5 pt-6 pb-8 rounded-b-3xl">
      <p className="text-sm text-orange-100 font-medium">
        {getGreeting()}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
      </p>
      <p className="text-xs text-orange-100/80 font-medium">Welcome to BodaSure!</p>
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
          <Link to="/app/profile" className="flex items-center gap-1.5 bg-white text-primary rounded-full px-3 py-1.5 font-semibold text-xs hover:bg-orange-50 transition-colors animate-pulse-glow">
            <AlertCircle className="w-4 h-4" />
            Activate Wallet
          </Link>
        )}
      </div>
      {walletActive && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Link to="/app/lipisha" className="bg-white text-primary rounded-xl py-3 font-semibold text-sm text-center hover:bg-orange-50 transition-colors">
            Collect Fare
          </Link>
          <Link to="/app/lipa-county" className="bg-white/15 backdrop-blur-sm text-primary-foreground rounded-xl py-3 font-semibold text-sm text-center hover:bg-white/25 transition-colors">
            Pay County
          </Link>
          <Link to="/app/wallet" className="bg-white/15 backdrop-blur-sm text-primary-foreground rounded-xl py-3 font-semibold text-sm text-center hover:bg-white/25 transition-colors">
            Wallet
          </Link>
          <Link to="/app/bikes" className="bg-white/15 backdrop-blur-sm text-primary-foreground rounded-xl py-3 font-semibold text-sm text-center hover:bg-white/25 transition-colors">
            My Bikes
          </Link>
        </div>
      )}
    </div>
  );
}
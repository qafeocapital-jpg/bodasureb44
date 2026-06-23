import { NavLink, useNavigate } from 'react-router-dom';
import { Home, ShieldCheck, Wallet, Bike, User, Lock } from 'lucide-react';

const navItems = [
  { to: '/app', label: 'Home', icon: Home },
  { to: '/app/compliance', label: 'Compliance', icon: ShieldCheck, lockedWhenNoWallet: true },
  { to: '/app/wallet', label: 'Wallet', icon: Wallet, lockedWhenNoWallet: true },
  { to: '/app/bikes', label: 'Bikes', icon: Bike, lockedWhenNoWallet: true },
  { to: '/app/account', label: 'Account', icon: User },
];

export default function BottomNav({ walletActive }) {
  const navigate = useNavigate();

  const handleLockedNav = (e) => {
    e.preventDefault();
    navigate('/app/wallet/activate');
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[512px] z-50 bg-white/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ to, label, icon: Icon, lockedWhenNoWallet }) => {
          const isLocked = lockedWhenNoWallet && !walletActive;
          
          if (isLocked) {
            return (
              <button
                key={to}
                onClick={handleLockedNav}
                className="flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors text-muted-foreground opacity-50 relative"
              >
                <div className="relative">
                  <Icon className="w-5 h-5" strokeWidth={2} />
                  <Lock className="w-3 h-3 absolute -top-1 -right-1 text-primary" />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/app'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
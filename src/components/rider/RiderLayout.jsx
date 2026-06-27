import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import RiderHeader from './RiderHeader';
import BottomNav from './BottomNav';
import SupportFAB from './SupportFAB';

export default function RiderLayout() {
  const { user } = useAuth();
  const [walletActive, setWalletActive] = useState(false);
  const [walletCheckComplete, setWalletCheckComplete] = useState(false);

  useEffect(() => {
    async function checkWallet() {
      setWalletCheckComplete(false);
      if (!user) {
        setWalletActive(false);
        setWalletCheckComplete(true);
        return;
      }
      try {
        const wallets = await base44.entities.Wallet.filter({ user_id: user.id, entity_type: 'personal' });
        if (wallets.length > 0) {
          setWalletActive(wallets[0].status === 'active' || wallets[0].tier > 0);
        } else {
          setWalletActive(false);
        }
      } catch (e) {
        setWalletActive(false);
      } finally {
        setWalletCheckComplete(true);
      }
    }
    checkWallet();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-stretch justify-center">
      {/* Left sidebar */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center px-8 bg-gradient-to-br from-slate-100 to-slate-50 border-r border-slate-200">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto shadow-xl">
            <span className="text-white font-heading font-black text-3xl">B</span>
          </div>
          <div className="space-y-2">
            <p className="text-slate-800 text-sm font-semibold">BodaSure</p>
            <p className="text-slate-600 text-xs leading-relaxed">Ride Smart.<br />Earn More.</p>
          </div>
        </div>
      </div>

      {/* Main app column */}
      <div className="min-h-screen bg-background max-w-[512px] w-full relative shadow-xl">
        <RiderHeader />
        <main className="pt-14 pb-20 min-h-screen">
          <Outlet />
        </main>
        <BottomNav walletActive={walletActive} />
        <SupportFAB />
      </div>

      {/* Right sidebar */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center px-8 bg-gradient-to-bl from-slate-100 to-slate-50 border-l border-slate-200">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto shadow-xl">
            <span className="text-white font-heading font-black text-3xl">B</span>
          </div>
          <div className="space-y-2">
            <p className="text-slate-800 text-sm font-semibold">BodaSure</p>
            <p className="text-slate-600 text-xs leading-relaxed">Ride Smart.<br />Earn More.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
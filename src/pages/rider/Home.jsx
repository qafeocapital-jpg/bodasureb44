import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { riderTileSections, tileColors } from '@/lib/riderTiles';
import { formatKES, getGreeting } from '@/lib/format';
import { ShieldCheck, AlertCircle, ChevronRight } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [walletActive, setWalletActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const u = await base44.auth.me();
        if (u) {
          setUser(u);
          const wallets = await base44.entities.Wallet.filter({ user_id: u.id, entity_type: 'personal' });
          if (wallets.length > 0) {
            const w = wallets[0];
            setWalletActive(w.status === 'active' || w.tier > 0);
            const snapshots = await base44.entities.WalletSnapshot.filter({ wallet_id: w.id });
            if (snapshots.length > 0) setBalance(snapshots[0].balance_cents || 0);
          }
        }
      } catch (e) {
        // Not logged in — show placeholder
      }
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-primary to-orange-600 text-primary-foreground px-5 pt-6 pb-8 rounded-b-3xl">
        <p className="text-sm text-orange-100 font-medium">
          {getGreeting()}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
        </p>
        <div className="mt-4">
          <p className="text-xs text-orange-100 uppercase tracking-wide font-medium">Wallet Balance</p>
          <p className="text-3xl font-heading font-extrabold mt-0.5">
            {loading ? '...' : formatKES(balance)}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4">
          {walletActive ? (
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-medium">Wallet Active</span>
            </div>
          ) : (
            <Link to="/app/wallet" className="flex items-center gap-1.5 bg-white text-primary rounded-full px-3 py-1.5 font-semibold text-xs hover:bg-orange-50 transition-colors">
              <AlertCircle className="w-4 h-4" />
              Activate Wallet
            </Link>
          )}
        </div>
      </div>

      {/* Icon Grid Sections */}
      <div className="px-4 py-5 space-y-7">
        {riderTileSections.map((section) => (
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
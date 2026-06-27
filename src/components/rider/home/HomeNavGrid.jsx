// Service tiles grid with locked/soon/expandable logic
import { Link, useNavigate } from 'react-router-dom';
import { riderTileSections, tileColors } from '@/lib/riderTiles';
import { getKycLevel } from '@/components/ui/KycLevelBadge';
import { Lock, ChevronDown, ChevronRight } from 'lucide-react';
import LockedTileSheet from '@/components/rider/LockedTileSheet';

export default function HomeNavGrid({ user, walletActive, lockedTile, setLockedTile, servicesExpanded, setServicesExpanded }) {
  const navigate = useNavigate();

  return (
    <>
      {/* Locked Tile Sheet */}
      {lockedTile && (
        <LockedTileSheet
          open={!!lockedTile}
          onClose={() => setLockedTile(null)}
          tileLabel={lockedTile.label}
          featureDescription={lockedTile.lockType === 'wallet' ? undefined : ({
            'Pay Owner': 'Pay bike owners directly for use and rental.',
            'Contributions': 'Join group savings and SACCO contributions.',
            'Insurance': 'Protect yourself with comprehensive coverage.',
          }[lockedTile.label] || 'This feature requires Tier 2 verification.')}
          title={lockedTile.lockType === 'wallet' ? 'Activate Your Wallet' : undefined}
          message={lockedTile.lockType === 'wallet' ? 'Activate your BodaSure Wallet to start collecting fares.' : undefined}
          actionLabel={lockedTile.lockType === 'wallet' ? 'Activate Wallet' : undefined}
          actionLink={lockedTile.lockType === 'wallet' ? '/app/profile' : undefined}
        />
      )}

      {/* Icon Grid Sections */}
      <div className="px-4 py-5 space-y-7">
        {user && riderTileSections.map((section) => {
          const isServices = section.title === 'BodaSure Services';
          const tilesToShow = isServices && !servicesExpanded
            ? section.tiles.slice(0, 4)
            : section.tiles;

          const renderTile = (tile) => {
            const Icon = tile.icon;
            const isSoon = tile.status === 'soon';
            const isWalletLocked = tile.requiresWallet && !walletActive;
            const isLocked = !isWalletLocked && tile.requiresTier2 && getKycLevel(user) < 2;
            const isAnyLocked = isWalletLocked || isLocked;
            const isChatAction = tile.action === 'open_chat';
            const TileElement = isSoon || isAnyLocked || isChatAction ? 'div' : Link;

            const tileConfig = {
              to: isSoon || isAnyLocked || isChatAction ? undefined : tile.path,
              onClick: isWalletLocked
                ? () => setLockedTile({ ...tile, lockType: 'wallet' })
                : isLocked
                ? () => setLockedTile(tile)
                : isChatAction
                ? () => {
                    if (window._support?.openChat) {
                      window._support.openChat();
                    } else {
                      navigate('/app/support');
                    }
                  }
                : undefined,
              className: 'flex flex-col items-center gap-1.5 cursor-pointer',
            };

            return (
              <TileElement key={tile.label} {...tileConfig}>
                <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-150 ease-out ${
                  isAnyLocked ? 'bg-slate-100 text-slate-400 active:scale-110' :
                  isSoon ? 'bg-slate-100 text-slate-400 active:scale-110' :
                  `${tileColors[tile.color]} active:scale-110`
                }`}>
                  <Icon className="w-6 h-6" strokeWidth={2} />
                  {isAnyLocked && (
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
                <span className={`text-[10px] text-center font-medium leading-tight ${isAnyLocked || isSoon ? 'text-slate-400' : 'text-foreground'}`}>
                  {tile.label}
                </span>
              </TileElement>
            );
          };

          return (
            <div key={section.title}>
              {isServices ? (
                <button
                  onClick={() => setServicesExpanded(!servicesExpanded)}
                  className="flex items-center gap-1.5 w-full mb-3 px-1"
                >
                  <h2 className="text-sm font-heading font-bold text-foreground">{section.title}</h2>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${servicesExpanded ? '' : '-rotate-90'}`} />
                </button>
              ) : (
                <h2 className="text-sm font-heading font-bold text-foreground mb-3 px-1">{section.title}</h2>
              )}
              <div className="grid grid-cols-4 gap-3">
                {tilesToShow.map(renderTile)}
                {isServices && (
                  <div
                    key="more-toggle"
                    onClick={() => setServicesExpanded(!servicesExpanded)}
                    className="flex flex-col items-center gap-1.5 cursor-pointer animate-fade-in"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-100 text-slate-500 active:scale-110 transition-transform duration-150">
                      {servicesExpanded
                        ? <ChevronDown className="w-6 h-6" />
                        : <ChevronRight className="w-6 h-6" />}
                    </div>
                    <span className="text-[10px] text-center font-medium leading-tight text-slate-500">
                      {servicesExpanded ? 'Less' : 'More'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
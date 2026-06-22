import { Outlet } from 'react-router-dom';
import RiderHeader from './RiderHeader';
import BottomNav from './BottomNav';

export default function RiderLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-stretch justify-center">
      {/* Left sidebar */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center px-6 bg-gradient-to-br from-slate-100 to-slate-50 border-r border-slate-200 relative overflow-hidden">
        {/* Premium vertical brand - BODASURE */}
        <div className="flex items-center justify-center h-full">
          <div 
            className="text-orange-600 font-heading font-black tracking-widest leading-none select-none"
            style={{ 
              fontSize: '5.5rem',
              transform: 'rotate(-90deg)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.15em',
              textShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            BODASURE
          </div>
        </div>
      </div>

      {/* Main app column */}
      <div className="min-h-screen bg-background max-w-[512px] w-full relative shadow-xl">
        <RiderHeader />
        <main className="pt-14 pb-20 min-h-screen">
          <Outlet />
        </main>
        <BottomNav />
      </div>

      {/* Right sidebar */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center px-6 bg-gradient-to-bl from-slate-100 to-slate-50 border-l border-slate-200 relative overflow-hidden">
        {/* Premium vertical brand - BODASURE mirrored */}
        <div className="flex items-center justify-center h-full">
          <div 
            className="text-orange-600 font-heading font-black tracking-widest leading-none select-none"
            style={{ 
              fontSize: '5.5rem',
              transform: 'rotate(90deg)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.15em',
              textShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            BODASURE
          </div>
        </div>
      </div>
    </div>
  );
}
import { Outlet } from 'react-router-dom';
import RiderHeader from './RiderHeader';
import BottomNav from './BottomNav';

export default function RiderLayout() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-stretch justify-center">
      {/* Left sidebar */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center px-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mx-auto mb-3">
            <span className="text-primary-foreground font-heading font-extrabold text-2xl">B</span>
          </div>
          <p className="text-slate-400 text-xs font-medium mt-4">Ride Smart. Earn More.</p>
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
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center px-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mx-auto mb-3">
            <span className="text-primary-foreground font-heading font-extrabold text-2xl">B</span>
          </div>
          <p className="text-slate-400 text-xs font-medium mt-4">Ride Smart. Earn More.</p>
        </div>
      </div>
    </div>
  );
}
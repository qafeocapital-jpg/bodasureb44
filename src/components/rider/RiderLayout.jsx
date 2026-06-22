import { Outlet } from 'react-router-dom';
import RiderHeader from './RiderHeader';
import BottomNav from './BottomNav';

export default function RiderLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-stretch justify-center">
      {/* Left sidebar */}
      <div className="hidden lg:flex flex-1 flex-col items-center px-8 bg-gradient-to-br from-slate-100 to-slate-50 border-r border-slate-200 relative">
        {/* Sticky logo anchor at top */}
        <div className="sticky top-0 pt-8 pb-4 flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
            <span className="text-white font-heading font-black text-2xl">B</span>
          </div>
        </div>
        
        {/* Vertical text brand - sticky, centered */}
        <div className="sticky top-0 h-screen flex items-center justify-center">
          <div className="flex gap-2 h-full items-center justify-center">
            {/* BODA in orange */}
            <div className="text-orange-600 font-heading font-black text-4xl leading-none tracking-tight" style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap' }}>
              BODA
            </div>
            {/* SURE in slate */}
            <div className="text-slate-800 font-heading font-black text-4xl leading-none tracking-tight" style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap' }}>
              SURE
            </div>
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
      <div className="hidden lg:flex flex-1 flex-col items-center px-8 bg-gradient-to-bl from-slate-100 to-slate-50 border-l border-slate-200 relative">
        {/* Sticky logo anchor at top */}
        <div className="sticky top-0 pt-8 pb-4 flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
            <span className="text-white font-heading font-black text-2xl">B</span>
          </div>
        </div>
        
        {/* Vertical text brand - sticky, centered, mirrored */}
        <div className="sticky top-0 h-screen flex items-center justify-center">
          <div className="flex gap-2 h-full items-center justify-center">
            {/* SURE in slate */}
            <div className="text-slate-800 font-heading font-black text-4xl leading-none tracking-tight" style={{ transform: 'rotate(90deg)', whiteSpace: 'nowrap' }}>
              SURE
            </div>
            {/* BODA in orange */}
            <div className="text-orange-600 font-heading font-black text-4xl leading-none tracking-tight" style={{ transform: 'rotate(90deg)', whiteSpace: 'nowrap' }}>
              BODA
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
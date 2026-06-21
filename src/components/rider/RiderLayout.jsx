import { Outlet } from 'react-router-dom';
import RiderHeader from './RiderHeader';
import BottomNav from './BottomNav';

export default function RiderLayout() {
  return (
    <div className="min-h-screen bg-background max-w-[512px] mx-auto relative shadow-xl">
      <RiderHeader />
      <main className="pt-14 pb-20 min-h-screen">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
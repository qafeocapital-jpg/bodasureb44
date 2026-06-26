import { Outlet } from 'react-router-dom';
import GlobalNav from './GlobalNav';
import Footer from './Footer';

export default function MarketingLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <GlobalNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
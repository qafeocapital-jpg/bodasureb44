import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { Navigate } from 'react-router-dom';
import RiderLayout from './components/rider/RiderLayout';
import StaffLayout from './components/staff/StaffLayout';
import { countyNav, saccoNav, merchantNav, agentNav, stageNav, adminNav } from './lib/staffNav';
import Home from './pages/rider/Home';
import Wallet from './pages/rider/Wallet';
import Bikes from './pages/rider/Bikes';
import Compliance from './pages/rider/Compliance';
import Account from './pages/rider/Account';
import CountyDashboard from './pages/county/Dashboard';
import SaccoDashboard from './pages/sacco/Dashboard';
import MerchantDashboard from './pages/merchant/Dashboard';
import AgentDashboard from './pages/agent/Dashboard';
import StageDashboard from './pages/stage/Dashboard';
import AdminOverview from './pages/admin/Overview';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />

      {/* Rider App (mobile-first) */}
      <Route element={<RiderLayout />}>
        <Route path="/app" element={<Home />} />
        <Route path="/app/wallet" element={<Wallet />} />
        <Route path="/app/bikes" element={<Bikes />} />
        <Route path="/app/compliance" element={<Compliance />} />
        <Route path="/app/account" element={<Account />} />
      </Route>

      {/* County Portal (emerald) */}
      <Route element={<StaffLayout accent="emerald" portalName="County" navItems={countyNav} />}>
        <Route path="/county/dashboard" element={<CountyDashboard />} />
      </Route>

      {/* SACCO Portal (blue) */}
      <Route element={<StaffLayout accent="blue" portalName="SACCO" navItems={saccoNav} />}>
        <Route path="/sacco/dashboard" element={<SaccoDashboard />} />
      </Route>

      {/* Merchant Portal (emerald) */}
      <Route element={<StaffLayout accent="emerald" portalName="Merchant" navItems={merchantNav} />}>
        <Route path="/merchant/dashboard" element={<MerchantDashboard />} />
      </Route>

      {/* Field Agent Portal (orange) */}
      <Route element={<StaffLayout accent="orange" portalName="Field Agent" navItems={agentNav} />}>
        <Route path="/agent/dashboard" element={<AgentDashboard />} />
      </Route>

      {/* Stage Portal (blue) */}
      <Route element={<StaffLayout accent="blue" portalName="Stage" navItems={stageNav} />}>
        <Route path="/stage/dashboard" element={<StageDashboard />} />
      </Route>

      {/* Super Admin Portal (orange) */}
      <Route element={<StaffLayout accent="orange" portalName="Super Admin" navItems={adminNav} />}>
        <Route path="/admin/overview" element={<AdminOverview />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
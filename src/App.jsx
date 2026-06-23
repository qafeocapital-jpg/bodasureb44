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
import Profile from './pages/rider/Profile';

import WalletActivate from './pages/rider/WalletActivate';
import BikeRegister from './pages/rider/BikeRegister';
import SaccoRegister from './pages/rider/SaccoRegister';
import StageApply from './pages/rider/StageApply';
import MyFleet from './pages/rider/MyFleet';

import Lipisha from './pages/rider/Lipisha';
import LipaCounty from './pages/rider/LipaCounty';
import LipaOwner from './pages/rider/LipaOwner';
import Groups from './pages/rider/Groups';
import Chama from './pages/rider/Chama';
import Stage from './pages/rider/Stage';
import Insurance from './pages/rider/Insurance';
import Services from './pages/rider/Services';
import Disputes from './pages/rider/Disputes';
import Support from './pages/rider/Support';
import CountyDashboard from './pages/county/Dashboard';
import SaccoDashboard from './pages/sacco/Dashboard';
import MerchantDashboard from './pages/merchant/Dashboard';
import AgentDashboard from './pages/agent/Dashboard';
import StageDashboard from './pages/stage/Dashboard';
import AdminOverview from './pages/admin/Overview';
import CountyRegistrations from './pages/county/Registrations';
import CountyPermits from './pages/county/Permits';
import CountyEnforcement from './pages/county/Enforcement';
import CountyRevenue from './pages/county/Revenue';
import { CountyPeople, CountyReports, CountySettings } from './pages/county/OtherPages';
import SaccoMembers from './pages/sacco/Members';
import SaccoBikes from './pages/sacco/Bikes';
import SaccoSettlements from './pages/sacco/Settlements';
import SaccoCompliance from './pages/sacco/Compliance';
import SaccoStages from './pages/sacco/Stages';
import SaccoApplications from './pages/sacco/Applications';
import MerchantProducts from './pages/merchant/Products';
import MerchantPolicies from './pages/merchant/Policies';
import AgentInvite from './pages/agent/Invite';
import AgentHistory from './pages/agent/History';
import StageMembers from './pages/stage/Members';
import StageCompliance from './pages/stage/Compliance';
import AdminCounties from './pages/admin/Counties';
import AdminSasaPay from './pages/admin/SasaPay';
import AdminUsers from './pages/admin/Users';
import AdminKyc from './pages/admin/Kyc';
import AdminMoney from './pages/admin/Money';
import AdminReports from './pages/admin/Reports';
import AdminReconciliation from './pages/admin/Reconciliation';
import AdminAuditLog from './pages/admin/AuditLog';
import AdminAnnouncements from './pages/admin/Announcements';
import AdminSaccos from './pages/admin/AdminSaccos';
import SeedData from './pages/admin/SeedData';
import RiderVerify from './pages/public/RiderVerify';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

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

  // Safety guard: if not loading, no authError, but no user — redirect to login
  if (!user) {
    navigateToLogin();
    return null;
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
        <Route path="/app/profile" element={<Profile />} />

        <Route path="/app/wallet/activate" element={<WalletActivate />} />
        <Route path="/app/bikes/register" element={<BikeRegister />} />
        <Route path="/app/fleet" element={<MyFleet />} />
        <Route path="/app/groups/register-sacco" element={<SaccoRegister />} />
        <Route path="/app/account/stage-apply" element={<StageApply />} />
        <Route path="/app/lipisha" element={<Lipisha />} />
        <Route path="/app/lipa-county" element={<LipaCounty />} />
        <Route path="/app/lipa-owner" element={<LipaOwner />} />
        <Route path="/app/groups" element={<Groups />} />
        <Route path="/app/chama" element={<Chama />} />
        <Route path="/app/stage" element={<Stage />} />
        <Route path="/app/insurance" element={<Insurance />} />
        <Route path="/app/services" element={<Services />} />
        <Route path="/app/disputes" element={<Disputes />} />
        <Route path="/app/support" element={<Support />} />
      </Route>

      {/* County Portal (emerald) */}
      <Route element={<StaffLayout accent="emerald" portalName="County" navItems={countyNav} requiredRole="county_admin" />}>
        <Route path="/county/dashboard" element={<CountyDashboard />} />
        <Route path="/county/registrations" element={<CountyRegistrations />} />
        <Route path="/county/permits" element={<CountyPermits />} />
        <Route path="/county/enforcement" element={<CountyEnforcement />} />
        <Route path="/county/revenue" element={<CountyRevenue />} />
        <Route path="/county/people" element={<CountyPeople />} />
        <Route path="/county/reports" element={<CountyReports />} />
        <Route path="/county/settings" element={<CountySettings />} />
      </Route>

      {/* SACCO Portal (blue) */}
      <Route element={<StaffLayout accent="blue" portalName="SACCO" navItems={saccoNav} requiredRole="sacco_admin" />}>
        <Route path="/sacco/dashboard" element={<SaccoDashboard />} />
        <Route path="/sacco/members" element={<SaccoMembers />} />
        <Route path="/sacco/bikes" element={<SaccoBikes />} />
        <Route path="/sacco/compliance" element={<SaccoCompliance />} />
        <Route path="/sacco/stages" element={<SaccoStages />} />
        <Route path="/sacco/applications" element={<SaccoApplications />} />
        <Route path="/sacco/settlements" element={<SaccoSettlements />} />
      </Route>

      {/* Merchant Portal (emerald) */}
      <Route element={<StaffLayout accent="emerald" portalName="Merchant" navItems={merchantNav} requiredRole="merchant_admin" />}>
        <Route path="/merchant/dashboard" element={<MerchantDashboard />} />
        <Route path="/merchant/products" element={<MerchantProducts />} />
        <Route path="/merchant/policies" element={<MerchantPolicies />} />
      </Route>

      {/* Field Agent Portal (orange) */}
      <Route element={<StaffLayout accent="orange" portalName="Field Agent" navItems={agentNav} requiredRole="field_agent" />}>
        <Route path="/agent/dashboard" element={<AgentDashboard />} />
        <Route path="/agent/invite" element={<AgentInvite />} />
        <Route path="/agent/history" element={<AgentHistory />} />
      </Route>

      {/* Stage Portal (blue) */}
      <Route element={<StaffLayout accent="blue" portalName="Stage" navItems={stageNav} requiredRole="stage_admin" />}>
        <Route path="/stage/dashboard" element={<StageDashboard />} />
        <Route path="/stage/members" element={<StageMembers />} />
        <Route path="/stage/compliance" element={<StageCompliance />} />
      </Route>

      {/* Super Admin Portal (orange) */}
      <Route element={<StaffLayout accent="orange" portalName="Super Admin" navItems={adminNav} requiredRole="super_admin" />}>
        <Route path="/admin/overview" element={<AdminOverview />} />
        <Route path="/admin/counties" element={<AdminCounties />} />
        <Route path="/admin/sasapay" element={<AdminSasaPay />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/kyc" element={<AdminKyc />} />
        <Route path="/admin/money" element={<AdminMoney />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/reconciliation" element={<AdminReconciliation />} />
        <Route path="/admin/audit" element={<AdminAuditLog />} />
        <Route path="/admin/announcements" element={<AdminAnnouncements />} />
        <Route path="/admin/saccos" element={<AdminSaccos />} />
        <Route path="/admin/seed" element={<SeedData />} />
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
          <Routes>
            {/* Public routes */}
            <Route path="/verify/:riderId" element={<RiderVerify />} />
            
            {/* Protected app routes */}
            <Route path="*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import BodaSureLoader from './components/BodaSureLoader';
import ReamazeSSOProvider from './components/ReamazeSSOProvider';
import RiderLayout from './components/rider/RiderLayout';
import StaffLayout from './components/staff/StaffLayout';
import { saccoNav, merchantNav, agentNav, adminNav, commsNav } from './lib/staffNav';
import CountyLayout from './components/county/CountyLayout';
import Home from './pages/rider/Home';
import Wallet from './pages/rider/Wallet';
import Bikes from './pages/rider/Bikes';
import Compliance from './pages/rider/Compliance';
import Account from './pages/rider/Account';
import Profile from './pages/rider/Profile';

import WalletActivate from './pages/rider/WalletActivate';
import BikeRegister from './pages/rider/BikeRegister';
import SaccoRegister from './pages/rider/SaccoRegister';
import MyFleet from './pages/rider/MyFleet';

import Lipisha from './pages/rider/Lipisha';
import LipaCounty from './pages/rider/LipaCounty';
import LipaOwner from './pages/rider/LipaOwner';
import Groups from './pages/rider/Groups';
import Chama from './pages/rider/Chama';
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
import CountyCompliance from './pages/county/Compliance';
import CountyMap from './pages/county/MapPage';
import CountyOwners from './pages/county/OwnersPage';
import CountyOnboarding from './pages/county/OnboardingPage';
import CountySettlements from './pages/county/SettlementsPage';
import CountyStages from './pages/county/StagesPage';
import CountySaccos from './pages/county/SaccosPage';
import CountySubCounties from './pages/county/SubCountiesPage';
import CountyUsers from './pages/county/UsersPage';
import CountyAudit from './pages/county/AuditPage';
import { CountyPeople, CountyReports, CountySettings } from './pages/county/OtherPages';
import SaccoMembers from './pages/sacco/Members';
import SaccoBikes from './pages/sacco/Bikes';
import SaccoSettlements from './pages/sacco/Settlements';
import SaccoCompliance from './pages/sacco/Compliance';
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
import AdminFlags from './pages/admin/Flags';
import Communications from './pages/admin/Communications';
import SeedData from './pages/admin/SeedData';
import ContentPages from './pages/admin/ContentPages';
import RiderVerify from './pages/public/RiderVerify';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import MarketingLayout from './components/marketing/MarketingLayout';
import MarketingHome from './pages/marketing/Home';
import Counties from './pages/marketing/Counties';
import Saccos from './pages/marketing/Saccos';
import Riders from './pages/marketing/Riders';
import HowItWorks from './pages/marketing/HowItWorks';
import About from './pages/marketing/About';
import Pricing from './pages/marketing/Pricing';
import SecurityPage from './pages/marketing/Security';
import Privacy from './pages/marketing/Privacy';
import Terms from './pages/marketing/Terms';
import Cookies from './pages/marketing/Cookies';
import Aml from './pages/marketing/Aml';
import AcceptableUse from './pages/marketing/AcceptableUse';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();
  const [minLoadDone, setMinLoadDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinLoadDone(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Show branded loader while checking app public settings, auth, or minimum brand display window
  if (isLoadingPublicSettings || isLoadingAuth || !minLoadDone) {
    return <BodaSureLoader size="fullscreen" />;
  }

  // Guard: if already on an auth page, don't redirect — prevents re-entry loop
  const _pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const _onAuthPage =
    _pathname.startsWith('/login') ||
    _pathname.startsWith('/register') ||
    _pathname.startsWith('/forgot-password') ||
    _pathname.startsWith('/reset-password');

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      if (!_onAuthPage) navigateToLogin();
      return null;
    }
  }

  // Safety guard: if not loading, no authError, but no user — redirect to login
  if (!user) {
    if (!_onAuthPage) navigateToLogin();
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

        <Route path="/app/wallet/activate" element={<Navigate to="/app/profile" replace />} />
        <Route path="/app/bikes/register" element={<BikeRegister />} />
        <Route path="/app/fleet" element={<MyFleet />} />
        <Route path="/app/groups/register-sacco" element={<SaccoRegister />} />
        <Route path="/app/lipisha" element={<Lipisha />} />
        <Route path="/app/lipa-county" element={<LipaCounty />} />
        <Route path="/app/lipa-owner" element={<LipaOwner />} />
        <Route path="/app/groups" element={<Groups />} />
        <Route path="/app/chama" element={<Chama />} />
        <Route path="/app/insurance" element={<Insurance />} />
        <Route path="/app/services" element={<Services />} />
        <Route path="/app/disputes" element={<Disputes />} />
        <Route path="/app/support" element={<Support />} />
      </Route>

      {/* County Portal (BodaSure orange, dark sidebar) */}
      <Route element={<CountyLayout />}>
        <Route path="/county/dashboard" element={<CountyDashboard />} />
        <Route path="/county/map" element={<CountyMap />} />
        <Route path="/county/registrations" element={<CountyRegistrations />} />
        <Route path="/county/owners" element={<CountyOwners />} />
        <Route path="/county/onboarding" element={<CountyOnboarding />} />
        <Route path="/county/people" element={<CountyPeople />} />
        <Route path="/county/permits" element={<CountyPermits />} />
        <Route path="/county/compliance" element={<CountyCompliance />} />
        <Route path="/county/enforcement" element={<CountyEnforcement />} />
        <Route path="/county/revenue" element={<CountyRevenue />} />
        <Route path="/county/settlements" element={<CountySettlements />} />
        <Route path="/county/stages" element={<CountyStages />} />
        <Route path="/county/saccos" element={<CountySaccos />} />
        <Route path="/county/subcounties" element={<CountySubCounties />} />
        <Route path="/county/users" element={<CountyUsers />} />
        <Route path="/county/audit" element={<CountyAudit />} />
        <Route path="/county/comms" element={<Communications />} />
        <Route path="/county/reports" element={<CountyReports />} />
        <Route path="/county/settings" element={<CountySettings />} />
      </Route>

      {/* SACCO Portal (blue) */}
      <Route element={<StaffLayout accent="blue" portalName="SACCO" navItems={saccoNav} requiredRole="sacco_admin" />}>
        <Route path="/sacco/dashboard" element={<SaccoDashboard />} />
        <Route path="/sacco/members" element={<SaccoMembers />} />
        <Route path="/sacco/bikes" element={<SaccoBikes />} />
        <Route path="/sacco/compliance" element={<SaccoCompliance />} />
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
      <Route element={<StaffLayout accent="blue" portalName="Stage" navItems={[]} requiredRole="stage_admin" />}>
        <Route path="/stage/dashboard" element={<StageDashboard />} />
        <Route path="/stage/members" element={<StageMembers />} />
        <Route path="/stage/compliance" element={<StageCompliance />} />
      </Route>

      {/* Super Admin & BodaSure Staff Portal (orange) */}
      <Route element={<StaffLayout accent="orange" portalName="Admin" navItems={adminNav} requiredRole={['super_admin', 'bodasure_staff']} />}>
        <Route path="/admin/overview" element={<AdminOverview />} />
        <Route path="/admin/flags" element={<AdminFlags />} />
        <Route path="/admin/counties" element={<AdminCounties />} />
        <Route path="/admin/sasapay" element={<AdminSasaPay />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/kyc" element={<AdminKyc />} />
        <Route path="/admin/money" element={<AdminMoney />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/reconciliation" element={<AdminReconciliation />} />
        <Route path="/admin/audit" element={<AdminAuditLog />} />
        <Route path="/admin/announcements" element={<AdminAnnouncements />} />
        <Route path="/admin/comms" element={<Communications />} />
        <Route path="/admin/comms/templates" element={<Communications />} />
        <Route path="/admin/comms/bulk" element={<Communications />} />
        <Route path="/admin/comms/logs" element={<Communications />} />
        <Route path="/admin/saccos" element={<AdminSaccos />} />
        <Route path="/admin/seed" element={<SeedData />} />
        <Route path="/admin/content/pages" element={<ContentPages />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <ReamazeSSOProvider />
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <Routes>
            {/* Auth routes — explicit so they render instead of falling through to AuthenticatedApp */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Public routes */}
            <Route path="/verify/:riderId" element={<RiderVerify />} />

            {/* Marketing website routes */}
            <Route element={<MarketingLayout />}>
              <Route path="/" element={<MarketingHome />} />
              <Route path="/counties" element={<Counties />} />
              <Route path="/saccos" element={<Saccos />} />
              <Route path="/riders" element={<Riders />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/about" element={<About />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/aml" element={<Aml />} />
              <Route path="/acceptable-use" element={<AcceptableUse />} />
            </Route>

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
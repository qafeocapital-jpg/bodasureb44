import {
  LayoutDashboard, Users, Bike, FileCheck, ShieldAlert,
  Landmark, FileText, Settings, Wallet, Banknote, MessageSquare,
  UserPlus, History, Building2, Database, Coins, FileBarChart,
  BadgeCheck, Scale, MapPin, ScrollText, Megaphone
} from 'lucide-react';

export const countyNav = [
  { label: 'Dashboard', path: '/county/dashboard', icon: LayoutDashboard },
  { label: 'Registrations', path: '/county/registrations', icon: Users },
  { label: 'Permits', path: '/county/permits', icon: BadgeCheck },
  { label: 'Enforcement', path: '/county/enforcement', icon: ShieldAlert },
  { label: 'Revenue', path: '/county/revenue', icon: Landmark },
  { label: 'People', path: '/county/people', icon: Users },
  { label: 'Reports', path: '/county/reports', icon: FileBarChart },
  { label: 'Settings', path: '/county/settings', icon: Settings },
];

export const saccoNav = [
  { label: 'Dashboard', path: '/sacco/dashboard', icon: LayoutDashboard },
  { label: 'Members', path: '/sacco/members', icon: Users },
  { label: 'Bikes', path: '/sacco/bikes', icon: Bike },
  { label: 'Settlements', path: '/sacco/settlements', icon: Banknote },
];

export const merchantNav = [
  { label: 'Dashboard', path: '/merchant/dashboard', icon: LayoutDashboard },
  { label: 'Products', path: '/merchant/products', icon: FileText },
  { label: 'Policies', path: '/merchant/policies', icon: ShieldAlert },
];

export const agentNav = [
  { label: 'Dashboard', path: '/agent/dashboard', icon: LayoutDashboard },
  { label: 'Invite Rider', path: '/agent/invite', icon: UserPlus },
  { label: 'History', path: '/agent/history', icon: History },
];

export const stageNav = [
  { label: 'Dashboard', path: '/stage/dashboard', icon: LayoutDashboard },
  { label: 'Members', path: '/stage/members', icon: Users },
  { label: 'Compliance', path: '/stage/compliance', icon: BadgeCheck },
];

export const adminNav = [
  { label: 'Overview', path: '/admin/overview', icon: LayoutDashboard },
  { label: 'Counties', path: '/admin/counties', icon: Building2 },
  { label: 'SACCOs', path: '/admin/saccos', icon: Building2 },
  { label: 'SasaPay', path: '/admin/sasapay', icon: Database },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'KYC Review', path: '/admin/kyc', icon: FileCheck },
  { label: 'Money Config', path: '/admin/money', icon: Coins },
  { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
  { label: 'Reports', path: '/admin/reports', icon: FileBarChart },
  { label: 'Audit Log', path: '/admin/audit', icon: ScrollText },
  { label: 'Seed Data', path: '/admin/seed', icon: Database },
];
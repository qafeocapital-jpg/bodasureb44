import {
  LayoutDashboard, Map, Users, Bike, ClipboardList,
  BadgeCheck, ShieldCheck, ShieldAlert,
  Landmark, Banknote, MapPin, Building2, Grid2x2,
  ScrollText, Settings, Settings2, MessageSquare, FileBarChart,
} from 'lucide-react';

export const countyNavGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/county/dashboard', icon: LayoutDashboard },
      { label: 'Live Map', path: '/county/map', icon: Map },
    ],
  },
  {
    label: 'Operators',
    items: [
      { label: 'Registrations', path: '/county/registrations', icon: Users },
      { label: 'Owners & Fleets', path: '/county/owners', icon: Bike },
      { label: 'Onboarding Queue', path: '/county/onboarding', icon: ClipboardList },
      { label: 'People', path: '/county/people', icon: Users },
    ],
  },
  {
    label: 'Permits & Compliance',
    items: [
      { label: 'Permits', path: '/county/permits', icon: BadgeCheck },
      { label: 'Compliance', path: '/county/compliance', icon: ShieldCheck },
      { label: 'Enforcement', path: '/county/enforcement', icon: ShieldAlert },
    ],
  },
  {
    label: 'Revenue',
    items: [
      { label: 'Revenue', path: '/county/revenue', icon: Landmark },
      { label: 'Settlements', path: '/county/settlements', icon: Banknote },
    ],
  },
  {
    label: 'Network',
    items: [
      { label: 'Stages', path: '/county/stages', icon: MapPin },
      { label: 'SACCOs', path: '/county/saccos', icon: Building2 },
      { label: 'Sub-Counties', path: '/county/subcounties', icon: Grid2x2 },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'County Users', path: '/county/users', icon: Settings2 },
      { label: 'Audit Log', path: '/county/audit', icon: ScrollText },
      { label: 'Communications', path: '/county/comms', icon: MessageSquare },
      { label: 'Reports', path: '/county/reports', icon: FileBarChart },
      { label: 'Settings', path: '/county/settings', icon: Settings },
    ],
  },
];

// Flat list for backward compatibility
export const countyNav = countyNavGroups.flatMap(g => g.items);
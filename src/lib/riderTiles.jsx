import {
  Wallet, Receipt, HandCoins, Send, FileText,
  Bike, BadgeCheck, QrCode, UserCheck, ShieldCheck,
  Landmark, History, AlertCircle, CalendarClock, Globe, Bell, Gavel,
  Users, UserPlus, PiggyBank,
  Phone, Wifi, Zap, Droplet, Tv, CreditCard, Gift, Coins,
  Home, GraduationCap, HeartPulse, Briefcase, Fuel,
  User, FileCheck, Lock, Headphones, CircleHelp, ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react';

export const tileColors = {
  orange: 'bg-orange-50 text-orange-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  teal: 'bg-teal-50 text-teal-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  sky: 'bg-sky-50 text-sky-600',
  pink: 'bg-pink-50 text-pink-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  slate: 'bg-slate-100 text-slate-400',
};

export const riderTileSections = [
  {
    title: 'My Money',
    tiles: [
      { label: 'Wallet', icon: Wallet, color: 'orange', path: '/app/wallet', status: 'live' },
      { label: 'Lipisha Fare', icon: HandCoins, color: 'emerald', path: '/app/lipisha', status: 'live', requiresWallet: true },
      { label: 'Lipa County', icon: Landmark, color: 'blue', path: '/app/lipa-county', status: 'live' },
      { label: 'Deposit', icon: ArrowDownToLine, color: 'sky', path: '/app/wallet?tab=deposit', status: 'live', requiresWallet: true },
      { label: 'Withdraw', icon: ArrowUpFromLine, color: 'rose', path: '/app/wallet?tab=withdraw', status: 'live', requiresWallet: true },
      { label: 'Send Money', icon: Send, color: 'violet', path: '/app/wallet?tab=send', status: 'live', requiresWallet: true },
      { label: 'Lipa Owner', icon: UserCheck, color: 'amber', path: '/app/lipa-owner', status: 'live', requiresWallet: true, requiresTier2: true },
      { label: 'Transactions', icon: History, color: 'indigo', path: '/app/wallet?tab=history', status: 'live' },
    ]
  },
  {
    title: 'My Bike',
    tiles: [
      { label: 'My Bikes', icon: Bike, color: 'orange', path: '/app/bikes', status: 'live' },
      { label: 'Pay License', icon: BadgeCheck, color: 'blue', path: '/app/lipa-county', status: 'live' },
      { label: 'My QR Code', icon: QrCode, color: 'green', path: '/app/bikes', status: 'live' },
      { label: 'Pay Owner', icon: UserCheck, color: 'violet', path: '/app/lipa-owner', status: 'live', requiresWallet: true, requiresTier2: true },
      { label: 'Insurance', icon: ShieldCheck, color: 'rose', path: '/app/insurance', status: 'live', requiresWallet: true, requiresTier2: true },
    ]
  },
  {
    title: 'My County',
    tiles: [
      { label: 'Pay Fees', icon: Landmark, color: 'orange', path: '/app/lipa-county', status: 'live' },
      { label: 'Fee History', icon: History, color: 'blue', path: '/app/lipa-county', status: 'live' },
      { label: 'Penalties', icon: AlertCircle, color: 'rose', path: '/app/compliance', status: 'live' },
      { label: 'Due Dates', icon: CalendarClock, color: 'amber', path: '/app/compliance', status: 'live' },
      { label: 'My Region', icon: Globe, color: 'teal', path: '/app/account', status: 'live' },
      { label: 'Disputes', icon: Gavel, color: 'rose', path: '/app/disputes', status: 'live' },
    ]
  },
  {
    title: 'My Groups',
    tiles: [
      { label: 'My SACCO', icon: Users, color: 'blue', path: '/app/groups', status: 'live' },
      { label: 'Members', icon: UserPlus, color: 'green', path: '/app/groups', status: 'live' },
      { label: 'Join Group', icon: UserPlus, color: 'orange', path: '/app/groups', status: 'live' },
      { label: 'Contributions', icon: PiggyBank, color: 'violet', path: '/app/chama', status: 'live', requiresWallet: true, requiresTier2: true },
      { label: 'Register SACCO', icon: Landmark, color: 'blue', path: '/app/groups/register-sacco', status: 'live' },
    ]
  },
  {
    title: 'BodaSure Services',
    tiles: [
      { label: 'Airtime', icon: Phone, color: 'orange', path: '/app/services', status: 'live', requiresWallet: true },
      { label: 'Data', icon: Wifi, color: 'blue', path: '/app/services', status: 'live', requiresWallet: true },
      { label: 'KPLC', icon: Zap, color: 'amber', path: '/app/services', status: 'live', requiresWallet: true },
      { label: 'Water', icon: Droplet, color: 'sky', path: '/app/services', status: 'live', requiresWallet: true },
      { label: 'TV', icon: Tv, color: 'violet', path: '/app/services', status: 'live', requiresWallet: true },
      { label: 'My Bills', icon: Receipt, color: 'green', path: '/app/services', status: 'live', requiresWallet: true },
      { label: 'Save & Earn', icon: Coins, color: 'teal', path: '/app/services', status: 'live', requiresWallet: true },
      { label: 'Rent', icon: Home, color: 'slate', path: null, status: 'soon' },
      { label: 'School', icon: GraduationCap, color: 'slate', path: null, status: 'soon' },
      { label: 'NHIF', icon: HeartPulse, color: 'slate', path: null, status: 'soon' },
      { label: 'NSSF', icon: Briefcase, color: 'slate', path: null, status: 'soon' },
      { label: 'Card', icon: CreditCard, color: 'slate', path: null, status: 'soon' },
      { label: 'Rewards', icon: Gift, color: 'slate', path: null, status: 'soon' },
      { label: 'Fuel Credit', icon: Fuel, color: 'slate', path: null, status: 'soon' },
    ]
  },
  {
    title: 'My Account',
    tiles: [
      { label: 'Profile', icon: User, color: 'orange', path: '/app/account', status: 'live' },
      { label: 'KYC', icon: FileCheck, color: 'blue', path: '/app/account', status: 'live' },
      { label: 'Alerts', icon: Bell, color: 'amber', path: '/app/account', status: 'live' },
      { label: 'Security', icon: Lock, color: 'rose', path: '/app/account', status: 'live' },
      { label: 'Support', icon: Headphones, color: 'green', action: 'open_chat', status: 'live' },
      { label: 'Help Center', icon: CircleHelp, color: 'blue', action: 'open_chat', status: 'live' },
    ]
  },
];
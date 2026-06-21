import {
  Wallet, Receipt, HandCoins, Send, FileText,
  Bike, BadgeCheck, QrCode, UserCheck, MapPin, ShieldCheck, FolderOpen, Wrench,
  Landmark, History, AlertCircle, CalendarClock, Globe, Bell, Gavel, Award,
  Users, UserPlus, PiggyBank, BarChart3, MessageCircle, Banknote,
  Phone, Wifi, Zap, Droplet, Tv, CreditCard, Gift, Coins,
  Home, GraduationCap, HeartPulse, Briefcase, ShoppingCart, Fuel,
  User, FileCheck, Lock, Headphones, CircleHelp
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
  slate: 'bg-slate-100 text-slate-400',
};

export const riderTileSections = [
  {
    title: 'My Money',
    tiles: [
      { label: 'Wallet', icon: Wallet, color: 'orange', path: '/app/wallet', status: 'live' },
      { label: 'Transactions', icon: Receipt, color: 'blue', path: '/app/wallet', status: 'live' },
      { label: 'Collect Fare', icon: HandCoins, color: 'green', path: '/app/lipisha', status: 'live' },
      { label: 'Send Money', icon: Send, color: 'violet', path: '/app/wallet', status: 'live' },
      { label: 'Statements', icon: FileText, color: 'amber', path: '/app/wallet', status: 'live' },
    ]
  },
  {
    title: 'My Bike',
    tiles: [
      { label: 'My Bikes', icon: Bike, color: 'orange', path: '/app/bikes', status: 'live' },
      { label: 'Pay License', icon: BadgeCheck, color: 'blue', path: '/app/lipa-county', status: 'live' },
      { label: 'My QR Code', icon: QrCode, color: 'green', path: '/app/bikes', status: 'live' },
      { label: 'Pay Owner', icon: UserCheck, color: 'violet', path: '/app/lipa-owner', status: 'live' },
      { label: 'My Stage', icon: MapPin, color: 'amber', path: '/app/stage', status: 'live' },
      { label: 'Insurance', icon: ShieldCheck, color: 'rose', path: '/app/insurance', status: 'live' },
      { label: 'Documents', icon: FolderOpen, color: 'slate', path: null, status: 'soon' },
      { label: 'Spare Parts', icon: Wrench, color: 'slate', path: null, status: 'soon' },
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
      { label: 'Notices', icon: Bell, color: 'slate', path: null, status: 'soon' },
      { label: 'Disputes', icon: Gavel, color: 'slate', path: null, status: 'soon' },
      { label: 'Certificates', icon: Award, color: 'slate', path: null, status: 'soon' },
    ]
  },
  {
    title: 'My Groups',
    tiles: [
      { label: 'My SACCO', icon: Users, color: 'blue', path: '/app/groups', status: 'live' },
      { label: 'Members', icon: UserPlus, color: 'green', path: '/app/groups', status: 'live' },
      { label: 'Join Group', icon: UserPlus, color: 'orange', path: '/app/groups', status: 'live' },
      { label: 'Contributions', icon: PiggyBank, color: 'violet', path: '/app/chama', status: 'live' },
      { label: 'Group Stats', icon: BarChart3, color: 'amber', path: '/app/groups', status: 'live' },
      { label: 'Group Chat', icon: MessageCircle, color: 'slate', path: null, status: 'soon' },
      { label: 'Group Loan', icon: Banknote, color: 'slate', path: null, status: 'soon' },
    ]
  },
  {
    title: 'BodaSure Services',
    tiles: [
      { label: 'Airtime', icon: Phone, color: 'orange', path: '/app/services', status: 'live' },
      { label: 'Data', icon: Wifi, color: 'blue', path: '/app/services', status: 'live' },
      { label: 'KPLC', icon: Zap, color: 'amber', path: '/app/services', status: 'live' },
      { label: 'Water', icon: Droplet, color: 'sky', path: '/app/services', status: 'live' },
      { label: 'TV', icon: Tv, color: 'violet', path: '/app/services', status: 'live' },
      { label: 'My Bills', icon: Receipt, color: 'green', path: '/app/services', status: 'live' },
      { label: 'Save & Earn', icon: Coins, color: 'teal', path: '/app/services', status: 'live' },
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
    title: 'Earn More',
    tiles: [
      { label: 'Insurance', icon: ShieldCheck, color: 'rose', path: '/app/insurance', status: 'live' },
      { label: 'Delivery Jobs', icon: Bike, color: 'slate', path: null, status: 'soon' },
      { label: 'Marketplace', icon: ShoppingCart, color: 'slate', path: null, status: 'soon' },
      { label: 'Shop', icon: ShoppingCart, color: 'slate', path: null, status: 'soon' },
    ]
  },
  {
    title: 'My Account',
    tiles: [
      { label: 'Profile', icon: User, color: 'orange', path: '/app/account', status: 'live' },
      { label: 'KYC', icon: FileCheck, color: 'blue', path: '/app/account', status: 'live' },
      { label: 'Alerts', icon: Bell, color: 'amber', path: '/app/account', status: 'live' },
      { label: 'Security', icon: Lock, color: 'rose', path: '/app/account', status: 'live' },
      { label: 'Support', icon: Headphones, color: 'green', path: '/app/account', status: 'live' },
      { label: 'Help Center', icon: CircleHelp, color: 'slate', path: null, status: 'soon' },
    ]
  },
];
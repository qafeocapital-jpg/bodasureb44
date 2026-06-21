import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { User, FileCheck, Bell, Lock, Headphones, LogOut, ChevronRight } from 'lucide-react';

export default function Account() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const u = await base44.auth.me();
        if (u) setUser(u);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, []);

  const menuItems = [
    { label: 'Profile', icon: User, desc: 'Edit your personal details' },
    { label: 'KYC Documents', icon: FileCheck, desc: 'Upload ID for verification' },
    { label: 'Alerts & Notifications', icon: Bell, desc: 'Manage your alert preferences' },
    { label: 'Security', icon: Lock, desc: 'PIN, password, and security' },
    { label: 'Support', icon: Headphones, desc: 'Get help and contact us' },
  ];

  return (
    <div className="p-5 animate-fade-in">
      <h1 className="text-xl font-heading font-bold mb-5">My Account</h1>

      {/* Profile Card */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-heading font-bold text-base">{user?.full_name || 'BodaSure Rider'}</p>
          <p className="text-sm text-muted-foreground">{user?.phone || user?.email || 'Not set'}</p>
          <span className="inline-block mt-1 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
            Tier {user?.wallet_tier || 0}
          </span>
        </div>
      </div>

      {/* Menu */}
      <div className="space-y-2">
        {menuItems.map((item, i) => (
          <button key={i} className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:bg-accent transition-colors">
            <item.icon className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={() => base44.auth.logout('/')}
        className="w-full mt-5 flex items-center justify-center gap-2 bg-destructive/5 text-destructive border border-destructive/20 rounded-xl py-3 font-semibold text-sm hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Log Out
      </button>

      <p className="text-center text-xs text-muted-foreground mt-5">BodaSure v1.0 · Mint Mobitech</p>
    </div>
  );
}
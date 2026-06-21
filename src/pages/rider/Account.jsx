import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getAccessiblePortals } from '@/lib/portals';
import { useToast } from '@/components/ui/use-toast';
import { User, FileCheck, Bell, Lock, Headphones, LogOut, ChevronRight, ShieldCheck } from 'lucide-react';

export default function Account() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  async function setSuperAdmin() {
    try {
      await base44.auth.updateMe({ role: 'super_admin' });
      await refreshUser();
      toast({ title: 'Role updated', description: 'You are now a Super Admin.' });
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  }
  const portals = getAccessiblePortals(user?.role);

  const menuItems = [
    { label: 'Profile', icon: User, desc: 'Edit your personal details', link: '/app/profile' },
    { label: 'KYC Documents', icon: FileCheck, desc: 'Upload ID for verification', link: '/app/kyc' },
    { label: 'Alerts & Notifications', icon: Bell, desc: 'Manage your alert preferences', link: '/app/account' },
    { label: 'Security', icon: Lock, desc: 'PIN, password, and security', link: '/app/account' },
    { label: 'Support', icon: Headphones, desc: 'Get help and contact us', link: '/app/account' },
  ];

  return (
    <div className="p-5 animate-fade-in">
      <h1 className="text-xl font-heading font-bold mb-5">My Account</h1>

      {/* Profile Card */}
      <Link to="/app/profile" className="block bg-card border border-border rounded-2xl p-5 mb-5 hover:bg-accent transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-heading font-bold text-base">{user?.full_name || 'BodaSure Rider'}</p>
              {user?.role === 'super_admin' && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                  <ShieldCheck className="w-3 h-3" /> Super Admin
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{user?.phone || user?.email || 'Not set'}</p>
            <span className="inline-block mt-1 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
              Tier {user?.wallet_tier || 0}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </Link>

      {/* Menu */}
      <div className="space-y-2">
        {menuItems.map((item, i) => (
          <Link key={i} to={item.link} className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:bg-accent transition-colors">
            <item.icon className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* Portal Switcher */}
      {portals.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-heading font-bold text-foreground mb-3">My Portals</h2>
          <div className="space-y-2">
            {portals.map((portal, i) => (
              <Link
                key={i}
                to={portal.path}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:bg-accent transition-colors"
              >
                <span className={`w-3 h-3 rounded-full ${portal.color}`} />
                <span className="flex-1 text-sm font-medium">{portal.name}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={() => base44.auth.logout('/')}
        className="w-full mt-5 flex items-center justify-center gap-2 bg-destructive/5 text-destructive border border-destructive/20 rounded-xl py-3 font-semibold text-sm hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Log Out
      </button>

      <p className="text-center text-xs text-muted-foreground mt-5">BodaSure v1.0 · Mint Mobitech</p>

      {user?.role !== 'super_admin' && (
        <button onClick={setSuperAdmin} className="block mx-auto mt-2 text-[10px] text-muted-foreground/60 hover:text-muted-foreground">
          ⚙ Dev: Set Super Admin
        </button>
      )}
    </div>
  );
}
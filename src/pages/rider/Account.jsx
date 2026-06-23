import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getAccessiblePortals } from '@/lib/portals';
import { User, FileCheck, Bell, Lock, Headphones, LogOut, ChevronRight, ShieldCheck, Layers, MapPin } from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/phone';
import KycLevelBadge from '@/components/ui/KycLevelBadge';

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!user) return;
    base44.entities.Vehicle.filter({ owner_id: user.id })
      .then(bikes => setIsOwner(bikes.length > 0))
      .catch(() => {});
  }, [user]);

  const portals = getAccessiblePortals(user, isOwner);
  // Filter out the rider portal itself since we're already in it
  const switchablePortals = portals.filter(p => p.path !== '/app');

  const menuItems = [
    { label: 'Profile', icon: User, desc: 'Edit your personal details', link: '/app/profile' },
    { label: 'KYC Documents', icon: FileCheck, desc: 'Upload ID for verification', link: '/app/profile' },
    { label: 'Alerts & Notifications', icon: Bell, desc: 'Manage your alert preferences', link: '/app/account' },
    { label: 'Security', icon: Lock, desc: 'PIN, password, and security', link: '/app/account' },
    { label: 'Support', icon: Headphones, desc: 'Get help and contact us', link: '/app/support' },
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
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-heading font-bold text-base">{user?.full_name || 'BodaSure Rider'}</p>
              {(user?.roles?.includes('super_admin') || user?.role === 'super_admin') && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                  <ShieldCheck className="w-3 h-3" /> Super Admin
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{user?.phone ? formatPhoneDisplay(user.phone) : user?.email || 'Not set'}</p>
            <div className="mt-1">
              <KycLevelBadge user={user} />
            </div>
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
      {switchablePortals.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-heading font-bold text-foreground mb-1">My Portals</h2>
          <p className="text-xs text-muted-foreground mb-3">Switch between your different roles</p>
          <div className="space-y-2">
            {switchablePortals.map((portal, i) => (
              <button
                key={i}
                onClick={() => navigate(portal.path)}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:bg-accent transition-colors text-left"
              >
                <span className={`w-3 h-3 rounded-full ${portal.color}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{portal.name}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Apply for roles */}
      <div className="mt-6">
        <h2 className="text-sm font-heading font-bold text-foreground mb-1">Opportunities</h2>
        <p className="text-xs text-muted-foreground mb-3">Register your SACCO or apply for leadership</p>
        <div className="space-y-2">
          <Link to="/app/groups/register-sacco" className="w-full flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 hover:bg-blue-100/50 transition-colors">
            <Layers className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Register My SACCO / Group</p>
              <p className="text-xs text-blue-600">Self-register your group for admin review</p>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-600" />
          </Link>
          <Link to="/app/account/stage-apply" className="w-full flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 hover:bg-emerald-100/50 transition-colors">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-900">Apply as Stage Leader</p>
              <p className="text-xs text-emerald-600">Lead a stage in your area</p>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-600" />
          </Link>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full mt-5 flex items-center justify-center gap-2 bg-destructive/5 text-destructive border border-destructive/20 rounded-xl py-3 font-semibold text-sm hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Log Out
      </button>

      <p className="text-center text-xs text-muted-foreground mt-5">BodaSure v1.0 · Mint Mobitech</p>
    </div>
  );
}
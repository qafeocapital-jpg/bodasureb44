import { useState, useEffect } from 'react';
import { Outlet, NavLink, Navigate, useLocation, Link } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { hasPortalAccess, getAccessiblePortals } from '@/lib/portals';
import { useToast } from '@/components/ui/use-toast';

const accentMap = {
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-200' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50', border: 'border-orange-200' },
};

export default function StaffLayout({ accent = 'orange', portalName = 'Portal', navItems = [], requiredRole }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const accentCls = accentMap[accent] || accentMap.orange;
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const portals = getAccessiblePortals(user);
  const showSwitcher = portals.length > 1;

  useEffect(() => {
    if (user && !hasPortalAccess(user, requiredRole)) {
      toast({
        title: 'Access denied',
        description: 'You do not have permission to access this portal.',
        variant: 'destructive',
      });
    }
  }, [user]);

  if (!user) return null;
  if (!hasPortalAccess(user, requiredRole)) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex w-64 flex-col bg-sidebar border-r border-sidebar-border ${accentCls.border}`}>
        <div className={`h-14 flex items-center px-5 ${accentCls.bg}`}>
          <span className="font-heading font-bold text-white text-lg">
            <span className="opacity-90">Boda</span>Sure
          </span>
          <span className="ml-2 text-xs text-white/80 font-medium bg-white/15 rounded-full px-2 py-0.5">{portalName}</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? `${accentCls.light} ${accentCls.text}` : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          {showSwitcher && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground px-3 mb-1">Portals</p>
              <div className="space-y-0.5">
                {portals.map((portal) => {
                  const isActivePortal = portal.name.startsWith(portalName);
                  return (
                    <Link
                      key={portal.path}
                      to={portal.path}
                      className={`flex items-center gap-2 py-2 px-3 rounded-lg text-sm transition-colors ${
                        isActivePortal ? `${accentCls.light} ${accentCls.text} font-medium` : 'text-sidebar-foreground hover:bg-sidebar-accent'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${portal.color}`} />
                      {portal.name}
                    </Link>
                  );
                })}
              </div>
              <div className="border-t border-sidebar-border mt-2" />
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className={`relative w-64 flex flex-col bg-sidebar border-r ${accentCls.border} animate-slide-up`}>
            <div className={`h-14 flex items-center justify-between px-5 ${accentCls.bg}`}>
              <span className="font-heading font-bold text-white">
                <span className="opacity-90">Boda</span>Sure
              </span>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? `${accentCls.light} ${accentCls.text}` : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t border-sidebar-border">
              {showSwitcher && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground px-3 mb-1">Portals</p>
                  <div className="space-y-0.5">
                    {portals.map((portal) => {
                      const isActivePortal = portal.name.startsWith(portalName);
                      return (
                        <Link
                          key={portal.path}
                          to={portal.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2 py-2 px-3 rounded-lg text-sm transition-colors ${
                            isActivePortal ? `${accentCls.light} ${accentCls.text} font-medium` : 'text-sidebar-foreground hover:bg-sidebar-accent'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${portal.color}`} />
                          {portal.name}
                        </Link>
                      );
                    })}
                  </div>
                  <div className="border-t border-sidebar-border mt-2" />
                </div>
              )}
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className={`lg:hidden h-14 flex items-center justify-between px-4 ${accentCls.bg}`}>
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-white" />
          </button>
          <span className="font-heading font-bold text-white text-lg">
            <span className="opacity-90">Boda</span>Sure
          </span>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
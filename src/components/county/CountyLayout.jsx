import { useState, useEffect } from 'react';
import { Outlet, NavLink, Navigate, useLocation, Link } from 'react-router-dom';
import { Menu, X, LogOut, Bell, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { hasPortalAccess, getAccessiblePortals } from '@/lib/portals';
import { useToast } from '@/components/ui/use-toast';
import { countyNavGroups } from '@/lib/countyNav';
import CountyGlobalSearch from '@/components/county/CountyGlobalSearch';

export default function CountyLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const portals = getAccessiblePortals(user);
  const showSwitcher = portals.length > 1;
  const [countyName, setCountyName] = useState('County');
  const [flagCount, setFlagCount] = useState(0);

  const countyId = user?.scope_entity_id || user?.county_id;

  useEffect(() => {
    if (countyId) {
      base44.entities.County.get(countyId)
        .then(c => setCountyName(c?.name || 'County'))
        .catch(() => {});
    }
  }, [countyId]);

  useEffect(() => {
    const v = typeof window !== 'undefined' ? sessionStorage.getItem('bodasure_flags_count') : null;
    setFlagCount(v ? parseInt(v, 10) : 0);
  }, [location.pathname]);

  const checkAccess = () => {
    if (!user) return false;
    if (hasPortalAccess(user, 'county_admin')) return true;
    if (hasPortalAccess(user, 'super_admin')) return true;
    if (hasPortalAccess(user, 'bodasure_staff')) return true;
    return false;
  };

  useEffect(() => {
    if (user && !checkAccess()) {
      toast({ title: 'Access denied', description: 'You do not have permission to access the County Portal.', variant: 'destructive' });
    }
  }, [user]);

  if (!user) return null;
  if (!checkAccess()) return <Navigate to="/app" replace />;

  const SidebarContent = () => (
    <>
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#ff5a1f] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white" />
          </div>
          <span className="font-heading font-bold text-white text-lg tracking-tight">
            Boda<span className="text-[#ff5a1f]">Sure</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 pl-9">
          <span className="text-xs text-stone-400 font-medium">{countyName}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-green-500 font-medium">Live</span>
        </div>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {countyNavGroups.map(group => (
          <div key={group.label} className="mb-4">
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#ff5a1f] text-white'
                        : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                    }`
                  }
                >
                  <div className="relative">
                    <item.icon className="w-[18px] h-[18px]" />
                    {item.path === '/county/enforcement' && flagCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
                        {flagCount > 99 ? '99+' : flagCount}
                      </span>
                    )}
                  </div>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-stone-800">
        {showSwitcher && (
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 px-3 mb-1">Portals</p>
            <div className="space-y-0.5">
              {portals.map(portal => (
                <Link
                  key={portal.path}
                  to={portal.path}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs text-stone-300 hover:bg-stone-800 hover:text-white transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full ${portal.color}`} />
                  {portal.name}
                </Link>
              ))}
            </div>
            <div className="border-t border-stone-800 mt-2" />
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </div>
    </>
  );

  // Derive breadcrumb from current path
  const currentPath = location.pathname;
  const allItems = countyNavGroups.flatMap(g => g.items);
  const currentNavItem = allItems.find(item => item.path === currentPath);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#15110d] fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 flex flex-col bg-[#15110d] animate-slide-up">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-3 z-10">
              <X className="w-5 h-5 text-stone-400" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Sticky Topbar */}
        <header className="sticky top-0 z-20 h-14 flex items-center gap-3 px-4 bg-white border-b border-border">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">County</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-foreground">{currentNavItem?.label || 'Dashboard'}</span>
          </div>
          <div className="flex-1 flex justify-center">
            <CountyGlobalSearch />
          </div>
          <Link to="/county/enforcement" className="relative p-2 rounded-lg hover:bg-accent transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {flagCount > 0 && (
              <span className="absolute top-1 right-1 bg-[#ff5a1f] text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
                {flagCount > 99 ? '99+' : flagCount}
              </span>
            )}
          </Link>
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="w-8 h-8 rounded-full bg-[#ff5a1f] flex items-center justify-center text-white text-xs font-bold">
              {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold leading-tight">{user?.full_name || 'User'}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">County Admin</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
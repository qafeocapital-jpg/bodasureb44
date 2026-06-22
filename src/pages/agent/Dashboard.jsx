import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { UserPlus, History, Users, TrendingUp } from 'lucide-react';

export default function AgentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalInvites: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const all = await base44.entities.Announcement.filter({ audience: 'all' }, '-created_date', 100);
        const myInvites = all.filter(a => a.title && a.title.startsWith('Invite:') && a.created_by_id === user.id);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonth = myInvites.filter(a => new Date(a.created_date) >= monthStart).length;
        setStats({ totalInvites: myInvites.length, thisMonth });
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  const kpis = [
    { label: 'Total Invites', value: loading ? '...' : stats.totalInvites, icon: Users, color: 'text-orange-600 bg-orange-50' },
    { label: 'This Month', value: loading ? '...' : stats.thisMonth, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold">Field Agent Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Recruit riders and track your invites</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color} mb-3`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-heading font-bold">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Link to="/agent/invite" className="bg-card border border-border rounded-xl p-5 hover:border-orange-300 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-5 h-5 text-orange-600" />
            <h2 className="font-heading font-bold">Invite Rider</h2>
          </div>
          <p className="text-sm text-muted-foreground">Enter a rider's phone number to send them an invite to join BodaSure.</p>
        </Link>
        <Link to="/agent/history" className="bg-card border border-border rounded-xl p-5 hover:border-blue-300 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-5 h-5 text-blue-600" />
            <h2 className="font-heading font-bold">Invite History</h2>
          </div>
          <p className="text-sm text-muted-foreground">{loading ? 'Loading...' : `${stats.totalInvites} invite${stats.totalInvites === 1 ? '' : 's'} sent`}</p>
        </Link>
      </div>
    </div>
  );
}
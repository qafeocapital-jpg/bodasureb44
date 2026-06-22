import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES } from '@/lib/format';
import { Users, Bike, Banknote, UserPlus } from 'lucide-react';

export default function SaccoDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ members: 0, bikes: 0, dividends: 0, applications: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const countyId = user?.scope_entity_id || user?.county_id;
        const saccoGroupId = user?.scope_entity_id;
        const [members, bikes, settlements, applications] = await Promise.all([
          countyId
            ? base44.entities.User.filter({ county_id: countyId, role: 'rider' })
            : base44.entities.User.filter({ role: 'rider' }),
          countyId
            ? base44.entities.Vehicle.filter({ county_id: countyId })
            : base44.entities.Vehicle.filter({}),
          saccoGroupId
            ? base44.entities.Settlement.filter({ entity_type: 'sacco', entity_id: saccoGroupId, status: 'pending' })
            : base44.entities.Settlement.filter({ entity_type: 'sacco', status: 'pending' }),
          base44.entities.Group.filter({ status: 'pending' }),
        ]);
        setStats({
          members: members.length,
          bikes: bikes.length,
          dividends: settlements.reduce((sum, s) => sum + (s.amount_cents || 0), 0),
          applications: applications.length,
        });
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  const kpis = [
    { label: 'Members', value: loading ? '...' : stats.members, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Bikes', value: loading ? '...' : stats.bikes, icon: Bike, color: 'text-orange-600 bg-orange-50' },
    { label: 'Dividends Pending', value: loading ? '...' : formatKES(stats.dividends), icon: Banknote, color: 'text-violet-600 bg-violet-50' },
    { label: 'Applications', value: loading ? '...' : stats.applications, icon: UserPlus, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold">SACCO Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your SACCO members and bikes</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  );
}
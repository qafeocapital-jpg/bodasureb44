import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Bike, BadgeCheck, Landmark, TrendingUp, AlertCircle } from 'lucide-react';

export default function CountyDashboard() {
  const [stats, setStats] = useState({ riders: 0, bikes: 0, permits: 0, revenue: 0 });

  useEffect(() => {
    async function load() {
      try {
        const [riders, bikes, permits] = await Promise.all([
          base44.entities.User.filter({ staff_type: 'none' }),
          base44.entities.Vehicle.filter({}),
          base44.entities.Permit.filter({ status: 'active' }),
        ]);
        setStats({ riders: riders.length, bikes: bikes.length, permits: permits.length, revenue: 0 });
      } catch (e) {}
    }
    load();
  }, []);

  const kpis = [
    { label: 'Registered Riders', value: stats.riders, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Active Bikes', value: stats.bikes, icon: Bike, color: 'text-orange-600 bg-orange-50' },
    { label: 'Active Permits', value: stats.permits, icon: BadgeCheck, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Revenue Today', value: 'KES 0', icon: Landmark, color: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold">County Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your county operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="font-heading font-bold">Recent Activity</h2>
          </div>
          <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-warning" />
            <h2 className="font-heading font-bold">Alerts</h2>
          </div>
          <p className="text-sm text-muted-foreground text-center py-8">No alerts</p>
        </div>
      </div>
    </div>
  );
}
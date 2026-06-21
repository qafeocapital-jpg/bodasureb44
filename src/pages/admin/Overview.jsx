import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Building2, Users, Bike, BadgeCheck, Database, Activity, ChevronRight } from 'lucide-react';

export default function AdminOverview() {
  const [stats, setStats] = useState({ counties: 0, riders: 0, bikes: 0, permits: 0 });

  useEffect(() => {
    async function load() {
      try {
        const [counties, riders, bikes, permits] = await Promise.all([
          base44.entities.County.filter({}),
          base44.entities.User.filter({ staff_type: 'none' }),
          base44.entities.Vehicle.filter({}),
          base44.entities.Permit.filter({ status: 'active' }),
        ]);
        setStats({ counties: counties.length, riders: riders.length, bikes: bikes.length, permits: permits.length });
      } catch (e) {}
    }
    load();
  }, []);

  const kpis = [
    { label: 'Counties', value: stats.counties, icon: Building2, color: 'text-orange-600 bg-orange-50' },
    { label: 'Total Riders', value: stats.riders, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Bikes', value: stats.bikes, icon: Bike, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Active Permits', value: stats.permits, icon: BadgeCheck, color: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold">Super Admin Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform-wide metrics and system health</p>
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
            <Activity className="w-5 h-5 text-orange-600" />
            <h2 className="font-heading font-bold">Service Health</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Base44 API</span>
              <span className="flex items-center gap-1 text-success font-medium"><span className="w-2 h-2 rounded-full bg-success" /> Operational</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">SasaPay (Mock)</span>
              <span className="flex items-center gap-1 text-success font-medium"><span className="w-2 h-2 rounded-full bg-success" /> Mock Mode</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Database</span>
              <span className="flex items-center gap-1 text-success font-medium"><span className="w-2 h-2 rounded-full bg-success" /> Connected</span>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="font-heading font-bold">Quick Actions</h2>
          </div>
          <div className="space-y-1 text-sm">
            <Link to="/admin/counties" className="flex items-center justify-between text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-2 py-1.5 transition-colors"><span>Add County</span><ChevronRight className="w-4 h-4 text-orange-600" /></Link>
            <Link to="/admin/kyc" className="flex items-center justify-between text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-2 py-1.5 transition-colors"><span>Review KYC</span><ChevronRight className="w-4 h-4 text-orange-600" /></Link>
            <Link to="/admin/money" className="flex items-center justify-between text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-2 py-1.5 transition-colors"><span>Configure Fees</span><ChevronRight className="w-4 h-4 text-orange-600" /></Link>
            <Link to="/admin/sasapay" className="flex items-center justify-between text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-2 py-1.5 transition-colors"><span>View Transactions</span><ChevronRight className="w-4 h-4 text-orange-600" /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
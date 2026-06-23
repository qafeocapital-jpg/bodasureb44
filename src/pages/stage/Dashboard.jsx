import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Users, BadgeCheck, MapPin } from 'lucide-react';

export default function StageDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ members: 0, compliant: 0, nonCompliant: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const stageId = user?.scope_entity_id || user?.stage_id;
        const [vehicles, permits] = await Promise.all([
          stageId
            ? base44.entities.Vehicle.filter({ stage_id: stageId })
            : base44.entities.Vehicle.filter({}),
          base44.entities.Permit.filter({ status: 'active' }),
        ]);
        const stageVehicleIds = new Set(vehicles.map(v => v.id));
        const compliantVehicleIds = new Set(permits.filter(p => stageVehicleIds.has(p.vehicle_id)).map(p => p.vehicle_id));
        const compliant = vehicles.filter(v => compliantVehicleIds.has(v.id)).length;
        setStats({
          members: vehicles.length,
          compliant,
          nonCompliant: vehicles.length - compliant,
        });
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  const kpis = [
    { label: 'Stage Members', value: loading ? '...' : stats.members, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Compliant', value: loading ? '...' : stats.compliant, icon: BadgeCheck, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Non-Compliant', value: loading ? '...' : stats.nonCompliant, icon: MapPin, color: 'text-rose-600 bg-rose-50' },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold">Stage Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your stage roster and compliance</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
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
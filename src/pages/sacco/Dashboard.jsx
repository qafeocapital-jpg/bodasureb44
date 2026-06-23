import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES } from '@/lib/format';
import { Users, Bike, Banknote, UserPlus, BadgeCheck, MapPin, AlertTriangle } from 'lucide-react';

export default function SaccoDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ members: 0, bikes: 0, dividends: 0, applications: 0, complianceRate: 0, compliantBikes: 0, nonCompliantBikes: 0, stageCompliance: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const saccoGroupId = user?.scope_entity_id;
        // Fetch members of this SACCO
        const groupMembers = saccoGroupId
          ? await base44.entities.GroupMember.filter({ group_id: saccoGroupId, status: 'approved' })
          : [];
        const memberUserIds = groupMembers.map(m => m.user_id);
        const bikes = memberUserIds.length > 0
          ? await base44.entities.Vehicle.filter({ county_id: user.county_id })
          : [];
        const [settlements, applications] = await Promise.all([
          saccoGroupId
            ? base44.entities.Settlement.filter({ entity_type: 'sacco', entity_id: saccoGroupId, status: 'pending' })
            : base44.entities.Settlement.filter({ entity_type: 'sacco', status: 'pending' }),
          base44.entities.GroupMember.filter({ group_id: saccoGroupId, status: 'pending' }).catch(() => []),
        ]);
        // Fetch permits and stages for compliance widgets
        const countyId = user?.county_id;
        const [allPermits, allStages] = await Promise.all([
          countyId ? base44.entities.Permit.filter({ county_id: countyId }) : base44.entities.Permit.filter({}),
          countyId ? base44.entities.Stage.filter({ county_id: countyId }).catch(() => []) : [],
        ]);

        const activePermits = allPermits.filter(p => p.status === 'active');
        const compliantBikes = bikes.filter(b => activePermits.some(p => p.vehicle_id === b.id));
        const complianceRate = bikes.length > 0 ? Math.round((compliantBikes.length / bikes.length) * 100) : 0;

        const stageCompliance = allStages.map(stage => {
          const stageBikes = bikes.filter(b => b.stage_id === stage.id);
          const stageCompliant = stageBikes.filter(b => activePermits.some(p => p.vehicle_id === b.id)).length;
          return {
            name: stage.name,
            total: stageBikes.length,
            compliant: stageCompliant,
            rate: stageBikes.length > 0 ? Math.round((stageCompliant / stageBikes.length) * 100) : 0,
          };
        });

        setStats({
          members: groupMembers.length,
          bikes: bikes.length,
          dividends: settlements.reduce((sum, s) => sum + (s.amount_cents || 0), 0),
          applications: applications.length,
          complianceRate,
          compliantBikes: compliantBikes.length,
          nonCompliantBikes: bikes.length - compliantBikes.length,
          stageCompliance,
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

      {/* Compliance Summary */}
      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        {/* Compliance Rate */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <BadgeCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="font-heading font-bold">Compliance Rate</h2>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-heading font-extrabold">{loading ? '...' : `${stats.complianceRate}%`}</span>
            <span className="text-xs text-muted-foreground">{stats.bikes} bikes tracked</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className={`h-2 rounded-full ${stats.complianceRate >= 75 ? 'bg-success' : stats.complianceRate >= 50 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${stats.complianceRate}%` }} />
          </div>
        </div>

        {/* Permit Status */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h2 className="font-heading font-bold">Permit Status</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Compliant</span>
              <span className="text-sm font-semibold text-success">{stats.compliantBikes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Non-Compliant</span>
              <span className="text-sm font-semibold text-destructive">{stats.nonCompliantBikes}</span>
            </div>
          </div>
        </div>

        {/* Stage Compliance */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h2 className="font-heading font-bold">Stage Compliance</h2>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">...</p>
          ) : stats.stageCompliance.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No stages</p>
          ) : (
            <div className="space-y-2">
              {stats.stageCompliance.slice(0, 5).map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">{s.name}</span>
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ml-2 ${s.rate >= 75 ? 'bg-success/10 text-success' : s.rate >= 50 ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{s.rate}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
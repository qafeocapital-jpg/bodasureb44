import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES, timeAgo } from '@/lib/format';
import { Users, Bike, BadgeCheck, Landmark, TrendingUp, AlertCircle, Banknote, Clock } from 'lucide-react';

export default function CountyDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ riders: 0, bikes: 0, permits: 0, revenue: 0 });
  const [recentTxns, setRecentTxns] = useState([]);
  const [recentPermits, setRecentPermits] = useState([]);

  const countyId = user?.scope_entity_id || user?.county_id;

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const vehicleFilter = countyId ? { county_id: countyId } : {};
        const permitFilter = countyId ? { county_id: countyId, status: 'active' } : { status: 'active' };
        const [allRiders, bikes, permits, recentPerms] = await Promise.all([
          base44.entities.User.filter({ staff_type: 'none' }),
          base44.entities.Vehicle.filter(vehicleFilter),
          base44.entities.Permit.filter(permitFilter),
          base44.entities.Permit.filter(countyId ? { county_id: countyId } : {}, '-created_date', 5),
        ]);

        // Build a set of county vehicle IDs for scoping transactions
        const countyVehicleIds = new Set(bikes.map(v => v.id));

        // Paginate through lipa_county transactions to get all completed ones for this county
        const countyTxns = [];
        let skip = 0;
        const batchLimit = 50;
        while (true) {
          const batch = await base44.entities.Transaction.filter({ type: 'lipa_county' }, '-created_date', batchLimit, skip);
          if (batch.length === 0) break;
          // Filter to this county's vehicles + completed status
          const matching = countyId
            ? batch.filter(t => t.status === 'completed' && (!t.vehicle_id || countyVehicleIds.has(t.vehicle_id)))
            : batch.filter(t => t.status === 'completed');
          countyTxns.push(...matching);
          if (batch.length < batchLimit) break;
          skip += batchLimit;
        }

        const revenue = countyTxns.reduce((sum, t) => sum + (t.amount_cents || 0), 0);
        const riders = countyId ? allRiders.filter(r => r.county_id === countyId) : allRiders;
        setStats({ riders: riders.length, bikes: bikes.length, permits: permits.length, revenue });
        // Show 10 most recent lipa_county txns for this county (including non-completed for activity feed)
        const recentCountyTxns = countyId
          ? countyTxns.slice(0, 10)
          : countyTxns.slice(0, 10);
        setRecentTxns(recentCountyTxns);
        setRecentPermits(recentPerms);
      } catch (e) {}
    }
    load();
  }, [user]);

  const kpis = [
    { label: 'Registered Riders', value: stats.riders, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Active Bikes', value: stats.bikes, icon: Bike, color: 'text-orange-600 bg-orange-50' },
    { label: 'Active Permits', value: stats.permits, icon: BadgeCheck, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Revenue (Recent)', value: formatKES(stats.revenue), icon: Landmark, color: 'text-violet-600 bg-violet-50' },
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
            <p className="text-xl font-heading font-bold">{kpi.value}</p>
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
          {recentTxns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent transactions</p>
          ) : (
            <div className="space-y-2">
              {recentTxns.map(tx => (
                <div key={tx.id} className="flex items-center justify-between border-b border-border last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{formatKES(tx.amount_cents)}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(tx.created_date)}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${tx.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{tx.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-warning" />
            <h2 className="font-heading font-bold">Alerts</h2>
          </div>
          {recentPermits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No alerts</p>
          ) : (
            <div className="space-y-2">
              {recentPermits.map(p => {
                const isExpired = p.status === 'expired' || (p.end_date && new Date(p.end_date) < new Date());
                return (
                  <div key={p.id} className="flex items-center justify-between border-b border-border last:border-0 pb-2 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isExpired ? 'bg-destructive/10' : 'bg-emerald-50'}`}>
                        {isExpired ? <AlertCircle className="w-4 h-4 text-destructive" /> : <BadgeCheck className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">{p.billing_cycle} Permit</p>
                        <p className="text-xs text-muted-foreground">{timeAgo(p.created_date)}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${isExpired ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                      {isExpired ? 'Expired' : 'Active'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
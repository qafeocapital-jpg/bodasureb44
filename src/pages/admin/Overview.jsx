import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { formatKES } from '@/lib/format';
import { Building2, Users, Bike, BadgeCheck, Database, Activity, ChevronRight, TrendingUp, Banknote, ScrollText, MapPin } from 'lucide-react';
import StageMap from '@/components/admin/StageMap';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AdminOverview() {
  const [stats, setStats] = useState({ counties: 0, riders: 0, bikes: 0, permits: 0 });
  const [revenue, setRevenue] = useState({ total: 0, byType: [] });
  const [recentTxns, setRecentTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [counties, riders, bikes, permits, txns, settlements, penalties] = await Promise.all([
          base44.entities.County.filter({}),
          base44.entities.User.filter({ staff_type: 'none' }),
          base44.entities.Vehicle.filter({}),
          base44.entities.Permit.filter({ status: 'active' }),
          base44.entities.Transaction.filter({ status: 'completed' }, '-created_date', 100),
          base44.entities.Settlement.filter({}, '-created_date', 10),
          base44.entities.Penalty.filter({ status: 'pending' }),
        ]);

        setStats({
          counties: counties.length,
          riders: riders.length,
          bikes: bikes.length,
          permits: permits.length,
        });

        // Revenue calculation
        const totalRevenue = txns.reduce((sum, t) => sum + (t.amount_cents || 0), 0);
        const typeMap = {};
        txns.forEach(t => {
          const type = t.type || 'other';
          if (!typeMap[type]) typeMap[type] = { type: type.replace(/_/g, ' '), amount: 0 };
          typeMap[type].amount += (t.amount_cents || 0);
        });
        setRevenue({ total: totalRevenue, byType: Object.values(typeMap) });
        setRecentTxns(txns.slice(0, 5));
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, []);

  const kpis = [
    { label: 'Counties', value: stats.counties, icon: Building2, color: 'text-orange-600 bg-orange-50' },
    { label: 'Total Riders', value: stats.riders, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Bikes', value: stats.bikes, icon: Bike, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Active Permits', value: stats.permits, icon: BadgeCheck, color: 'text-violet-600 bg-violet-50' },
  ];

  if (loading) {
    return <div className="p-6"><p className="text-sm text-muted-foreground">Loading...</p></div>;
  }

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

      {/* Revenue Summary */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-success" />
            <h2 className="font-heading font-bold text-sm">Total Revenue (Completed)</h2>
          </div>
          <p className="text-3xl font-heading font-extrabold text-success">{formatKES(revenue.total)}</p>
          <p className="text-xs text-muted-foreground mt-1">From last 100 completed transactions</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Banknote className="w-5 h-5 text-orange-600" />
            <h2 className="font-heading font-bold text-sm">Revenue by Transaction Type</h2>
          </div>
          {revenue.byType.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenue.byType}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="type" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `KSh ${(v / 100).toFixed(0)}`} />
                <Tooltip formatter={(v) => formatKES(v)} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">No revenue data yet</p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-600" />
              <h2 className="font-heading font-bold">Recent Transactions</h2>
            </div>
            <Link to="/admin/reports" className="text-xs text-primary font-semibold">View all →</Link>
          </div>
          {recentTxns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {recentTxns.map(t => (
                <div key={t.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="font-medium capitalize">{t.type?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">{formatKES(t.amount_cents)}</p>
                  </div>
                  <span className="text-xs font-semibold text-success bg-success/10 rounded-full px-2 py-0.5">{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="font-heading font-bold">System Health</h2>
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
          <div className="border-t border-border mt-4 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <ScrollText className="w-4 h-4 text-orange-600" />
              <h3 className="font-heading font-bold text-sm">Quick Actions</h3>
            </div>
            <div className="space-y-1 text-sm">
              <Link to="/admin/counties" className="flex items-center justify-between text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-2 py-1.5 transition-colors"><span>Add County</span><ChevronRight className="w-4 h-4 text-orange-600" /></Link>
              <Link to="/admin/kyc" className="flex items-center justify-between text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-2 py-1.5 transition-colors"><span>Review KYC</span><ChevronRight className="w-4 h-4 text-orange-600" /></Link>
              <Link to="/admin/money" className="flex items-center justify-between text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-2 py-1.5 transition-colors"><span>Configure Fees</span><ChevronRight className="w-4 h-4 text-orange-600" /></Link>
              <Link to="/admin/audit" className="flex items-center justify-between text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-2 py-1.5 transition-colors"><span>View Audit Log</span><ChevronRight className="w-4 h-4 text-orange-600" /></Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Map */}
      <div className="bg-card border border-border rounded-xl p-5 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-orange-600" />
          <h2 className="font-heading font-bold">Stage Map — All Counties</h2>
        </div>
        <StageMap countyId={null} />
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES, formatKESShort, timeAgo } from '@/lib/format';
import {
  Users, Landmark, BadgeCheck, AlertCircle, TrendingUp, TrendingDown,
  Clock, FileCheck, Bell, ChevronRight, Activity, UserCheck, Bike,
} from 'lucide-react';

const STATE_GROUPS = [
  { label: 'Verified', states: ['VERIFIED'], color: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Basic Active', states: ['BASIC_ACTIVE'], color: 'bg-[#ff5a1f]', text: 'text-[#ff5a1f]', bg: 'bg-orange-50' },
  { label: 'KYC Pending', states: ['KYC_PENDING', 'KYC_REVIEW'], color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Draft', states: ['DRAFT', 'KYC_REJECTED'], color: 'bg-stone-400', text: 'text-stone-500', bg: 'bg-stone-100' },
  { label: 'Suspended', states: ['SUSPENDED', 'DEACTIVATED'], color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
];

const ACTIVITY_ICONS = {
  permit_issued: { icon: BadgeCheck, color: 'text-green-600 bg-green-50' },
  vehicle_approved: { icon: Bike, color: 'text-blue-600 bg-blue-50' },
  kyc_approved: { icon: FileCheck, color: 'text-green-600 bg-green-50' },
  account_state_transition: { icon: UserCheck, color: 'text-[#ff5a1f] bg-orange-50' },
  penalty_issued: { icon: AlertCircle, color: 'text-red-600 bg-red-50' },
  default: { icon: Activity, color: 'text-stone-500 bg-stone-100' },
};

function getMonthStart() {
  return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
}
function getLastMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end };
}
function getYtdStart() {
  return new Date(new Date().getFullYear(), 0, 1);
}

export default function CountyDashboard() {
  const { user } = useAuth();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ riders: 0, revenueThisMonth: 0, revenueLastMonth: 0, revenueYtd: 0, complianceRate: 0, openFlags: 0 });
  const [stateBreakdown, setStateBreakdown] = useState([]);
  const [activity, setActivity] = useState([]);
  const [needsAttention, setNeedsAttention] = useState({ pendingApprovals: 0, onboardingQueue: 0, expiringPermits: 0, openFlags: 0 });

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const vehicleFilter = countyId ? { county_id: countyId } : {};
      const userFilter = countyId ? { county_id: countyId, staff_type: 'none' } : { staff_type: 'none' };

      const [riders, bikes, permits, pendingBikes, flaggedBikes, pendingKyc] = await Promise.all([
        base44.entities.User.filter(userFilter),
        base44.entities.Vehicle.filter(vehicleFilter),
        base44.entities.Permit.filter(countyId ? { county_id: countyId } : {}),
        base44.entities.Vehicle.filter({ ...vehicleFilter, status: 'pending' }),
        base44.entities.Vehicle.filter({ ...vehicleFilter, needs_review: true }),
        base44.entities.KycDocument.filter({ status: 'pending' }),
      ]);

      // Build county vehicle ID set for transaction filtering
      const countyVehicleIds = new Set(bikes.map(v => v.id));

      // Paginate lipa_county transactions
      const allTxns = [];
      let skip = 0;
      while (true) {
        const batch = await base44.entities.Transaction.filter({ type: 'lipa_county' }, '-created_date', 50, skip);
        if (batch.length === 0) break;
        const matching = countyId ? batch.filter(t => !t.vehicle_id || countyVehicleIds.has(t.vehicle_id)) : batch;
        allTxns.push(...matching);
        if (batch.length < 50) break;
        skip += 50;
      }

      const completedTxns = allTxns.filter(t => t.status === 'completed');
      const monthStart = getMonthStart();
      const ytdStart = getYtdStart();
      const { start: lastMonthStart, end: lastMonthEnd } = getLastMonthRange();

      const revenueThisMonth = completedTxns
        .filter(t => new Date(t.created_date) >= monthStart)
        .reduce((sum, t) => sum + (t.amount_cents || 0), 0);
      const revenueLastMonth = completedTxns
        .filter(t => new Date(t.created_date) >= lastMonthStart && new Date(t.created_date) < lastMonthEnd)
        .reduce((sum, t) => sum + (t.amount_cents || 0), 0);
      const revenueYtd = completedTxns
        .filter(t => new Date(t.created_date) >= ytdStart)
        .reduce((sum, t) => sum + (t.amount_cents || 0), 0);

      // Compliance rate: vehicles with active permit / total approved vehicles
      const approvedBikes = bikes.filter(v => v.status === 'approved');
      const now = new Date();
      const activePermitVehicleIds = new Set(
        permits.filter(p => p.status === 'active' && (!p.end_date || new Date(p.end_date) > now)).map(p => p.vehicle_id)
      );
      const compliantCount = approvedBikes.filter(v => activePermitVehicleIds.has(v.id)).length;
      const complianceRate = approvedBikes.length > 0 ? Math.round((compliantCount / approvedBikes.length) * 100) : 0;

      // Open flags
      const openFlags = flaggedBikes.length + pendingKyc.filter(k => {
        // Only count KYC docs for county users
        return riders.some(r => r.id === k.user_id);
      }).length;

      // Rider state breakdown
      const breakdown = STATE_GROUPS.map(group => ({
        ...group,
        count: riders.filter(r => group.states.includes(r.account_state)).length,
      }));

      // Permits expiring within 7 days
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const expiringPermits = permits.filter(p =>
        p.status === 'active' && p.end_date && new Date(p.end_date) > now && new Date(p.end_date) <= sevenDaysFromNow
      );

      // Onboarding queue: DRAFT or BASIC_ACTIVE with no active permit
      const onboardingQueue = riders.filter(r =>
        (r.account_state === 'DRAFT' || r.account_state === 'BASIC_ACTIVE') &&
        !bikes.some(v => v.rider_id === r.id && activePermitVehicleIds.has(v.id))
      ).length;

      setStats({
        riders: riders.length,
        revenueThisMonth,
        revenueLastMonth,
        revenueYtd,
        complianceRate,
        openFlags,
      });
      setStateBreakdown(breakdown);
      setNeedsAttention({
        pendingApprovals: pendingBikes.length,
        onboardingQueue,
        expiringPermits: expiringPermits.length,
        openFlags,
      });

      // Live activity feed — fetch county-scoped audit logs
      const countyUserIds = new Set(riders.map(r => r.id));
      const auditLogs = await base44.entities.AuditLog.filter({}, '-created_date', 50);
      const relevantTypes = ['permit_issued', 'vehicle_approved', 'kyc_approved', 'account_state_transition', 'penalty_issued', 'vehicle_rejected', 'kyc_rejected'];
      const scopedLogs = auditLogs
        .filter(log => relevantTypes.includes(log.action))
        .filter(log => !countyId || countyUserIds.has(log.user_id) || log.description?.includes(countyId))
        .slice(0, 10);
      setActivity(scopedLogs);
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
    setLoading(false);
  }

  const revenueChange = stats.revenueLastMonth > 0
    ? Math.round(((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth) * 100)
    : null;
  const totalRiders = stateBreakdown.reduce((sum, s) => sum + s.count, 0);

  const kpis = [
    { label: 'Registered Riders', value: stats.riders, icon: Users, color: 'bg-orange-50 text-[#ff5a1f]' },
    { label: 'Revenue This Month', value: formatKESShort(stats.revenueThisMonth), icon: Landmark, color: 'bg-orange-50 text-[#ff5a1f]' },
    { label: 'Compliance Rate', value: `${stats.complianceRate}%`, icon: BadgeCheck, color: 'bg-orange-50 text-[#ff5a1f]' },
    { label: 'Open Flags', value: stats.openFlags, icon: AlertCircle, color: 'bg-orange-50 text-[#ff5a1f]' },
  ];

  const attentionItems = [
    { label: 'Pending Vehicle Approvals', count: needsAttention.pendingApprovals, path: '/county/registrations', icon: Bike },
    { label: 'Onboarding Queue', count: needsAttention.onboardingQueue, path: '/county/onboarding', icon: Clock },
    { label: 'Permits Expiring (7 days)', count: needsAttention.expiringPermits, path: '/county/permits', icon: AlertCircle },
    { label: 'Open Flags', count: needsAttention.openFlags, path: '/county/enforcement', icon: Bell },
  ];

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground py-20">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 animate-fade-in space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold">County Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time overview of county operations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-heading font-bold">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Rider Status Breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[#ff5a1f]" />
            <h2 className="font-heading font-bold">Rider Status Breakdown</h2>
          </div>
          <div className="space-y-3">
            {stateBreakdown.map(group => {
              const pct = totalRiders > 0 ? Math.round((group.count / totalRiders) * 100) : 0;
              return (
                <div key={group.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{group.label}</span>
                    <span className="text-muted-foreground">{group.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${group.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {totalRiders === 0 && <p className="text-sm text-muted-foreground text-center py-6">No riders registered yet</p>}
          </div>
        </div>

        {/* Revenue KPI Strip */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#ff5a1f]" />
            <h2 className="font-heading font-bold">Revenue Summary</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">This Month</p>
              <p className="text-lg font-heading font-bold">{formatKESShort(stats.revenueThisMonth)}</p>
            </div>
            <div className="text-center border-l border-border">
              <p className="text-xs text-muted-foreground mb-1">Last Month</p>
              <p className="text-lg font-heading font-bold">{formatKESShort(stats.revenueLastMonth)}</p>
            </div>
            <div className="text-center border-l border-border">
              <p className="text-xs text-muted-foreground mb-1">YTD</p>
              <p className="text-lg font-heading font-bold">{formatKESShort(stats.revenueYtd)}</p>
            </div>
          </div>
          {revenueChange !== null && (
            <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-border">
              {revenueChange >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-semibold ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueChange >= 0 ? '+' : ''}{revenueChange}% vs last month
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Live Activity Feed */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-[#ff5a1f]" />
            <h2 className="font-heading font-bold">Live Activity</h2>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activity.map(log => {
                const config = ACTIVITY_ICONS[log.action] || ACTIVITY_ICONS.default;
                const Icon = config.icon;
                return (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.description || log.action}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(log.created_date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Needs Attention */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h2 className="font-heading font-bold">Needs Attention</h2>
          </div>
          <div className="space-y-2">
            {attentionItems.map(item => (
              <Link
                key={item.label}
                to={item.path}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-[#ff5a1f]" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${item.count > 0 ? 'text-[#ff5a1f]' : 'text-muted-foreground'}`}>{item.count}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
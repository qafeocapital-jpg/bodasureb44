import { useEffect, useState, Fragment } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES, formatDate } from '@/lib/format';
import { formatPlate } from '@/lib/plate';
import { Users, BadgeCheck, Banknote, Filter, Bike, ChevronDown, ChevronRight } from 'lucide-react';

export default function SaccoCompliance() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [bikes, setBikes] = useState([]);
  const [permits, setPermits] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [riders, setRiders] = useState([]);
  const [stages, setStages] = useState([]);
  const [feeRules, setFeeRules] = useState([]);
  const [stageFilter, setStageFilter] = useState('all');
  const [expandedRider, setExpandedRider] = useState(null);
  const [loading, setLoading] = useState(true);

  const saccoGroupId = user?.scope_entity_id;

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const countyId = user?.county_id;
        const [allMembers, allBikes, allPermits, allPolicies, allStages, allRules] = await Promise.all([
          base44.entities.GroupMember.filter({ group_id: saccoGroupId, status: 'approved' }),
          countyId ? base44.entities.Vehicle.filter({ county_id: countyId }) : base44.entities.Vehicle.filter({}),
          base44.entities.Permit.filter({ status: 'active' }),
          base44.entities.Policy.filter({ status: 'active' }),
          base44.entities.Stage.filter({ county_id: countyId }).catch(() => []),
          base44.entities.FeeRule.filter({ is_active: true }),
        ]);
        setMembers(allMembers);
        setBikes(allBikes);
        setPermits(allPermits);
        setPolicies(allPolicies);
        setStages(allStages);
        setFeeRules(allRules);

        // Fetch rider details
        const riderIds = [...new Set(allBikes.map(b => b.rider_id).filter(Boolean))];
        if (riderIds.length > 0) {
          const riderData = await Promise.all(riderIds.map(id => base44.entities.User.get(id).catch(() => null)));
          setRiders(riderData.filter(Boolean));
        }
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user, saccoGroupId]);

  const riderName = (id) => riders.find(r => r.id === id)?.full_name || 'Unknown';
  const bikePermit = (bikeId) => permits.find(p => p.vehicle_id === bikeId);
  const bikePolicy = (bikeId) => policies.find(p => p.vehicle_id === bikeId);

  const filteredBikes = stageFilter === 'all' ? bikes : bikes.filter(b => b.stage_id === stageFilter);
  const compliantCount = filteredBikes.filter(b => bikePermit(b.id)).length;
  const compliancePct = filteredBikes.length > 0 ? Math.round((compliantCount / filteredBikes.length) * 100) : 0;

  // Calculate SACCO revenue share
  const lipaCountyRules = feeRules.filter(f => f.product_type === 'lipa_county' || f.product_type === 'lipisha');
  const saccoSharePct = lipaCountyRules[0]?.sacco_percentage || 20;
  const totalPermitRevenue = permits.reduce((sum, p) => sum + (p.amount_paid_cents || 0), 0);
  const saccoRevenue = Math.round(totalPermitRevenue * saccoSharePct / 100);

  if (loading) {
    return <div className="p-6 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  const kpis = [
    { label: 'Total Members', value: members.length, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Compliance Rate', value: `${compliancePct}%`, icon: BadgeCheck, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'SACCO Revenue Share', value: formatKES(saccoRevenue), icon: Banknote, color: 'text-violet-600 bg-violet-50' },
    { label: 'Total Bikes', value: filteredBikes.length, icon: Bike, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Compliance & Earnings</h1>
      <p className="text-sm text-muted-foreground mb-5">Track member compliance and SACCO revenue</p>

      {/* KPIs */}
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

      {/* Stage Filter */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
        >
          <option value="all">All Stages</option>
          {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Member Bikes Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rider</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plate</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Permit</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Last Paid</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Insurance</th>
            </tr>
          </thead>
          <tbody>
            {filteredBikes.map(bike => {
              const permit = bikePermit(bike.id);
              const policy = bikePolicy(bike.id);
              return (
                <Fragment key={bike.id}>
                  <tr
                    className="border-t border-border hover:bg-accent/50 cursor-pointer"
                    onClick={() => setExpandedRider(expandedRider === bike.id ? null : bike.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {expandedRider === bike.id ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                        <span className="font-medium">{riderName(bike.rider_id)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{formatPlate(bike.plate_number)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${permit ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {permit ? 'Active' : 'None'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{permit ? formatDate(permit.start_date) : '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${policy ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {policy ? 'Active' : 'None'}
                      </span>
                    </td>
                  </tr>
                  {expandedRider === bike.id && (
                    <tr className="bg-muted/30">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div><span className="text-muted-foreground">Make:</span> <span className="font-medium">{bike.make || '—'}</span></div>
                          <div><span className="text-muted-foreground">Color:</span> <span className="font-medium">{bike.color || '—'}</span></div>
                          <div><span className="text-muted-foreground">Permit End:</span> <span className="font-medium">{permit ? formatDate(permit.end_date) : '—'}</span></div>
                          <div><span className="text-muted-foreground">Insurance End:</span> <span className="font-medium">{policy ? formatDate(policy.end_date) : '—'}</span></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {filteredBikes.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No bikes found</p>}
      </div>

      {/* Revenue Breakdown */}
      <div className="mt-6 bg-card border border-border rounded-xl p-5">
        <h2 className="font-heading font-bold mb-3">Revenue Breakdown</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Permit Revenue (Active)</span>
            <span className="text-sm font-semibold">{formatKES(totalPermitRevenue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">SACCO Share ({saccoSharePct}%)</span>
            <span className="text-sm font-bold text-primary">{formatKES(saccoRevenue)}</span>
          </div>
          <div className="pt-2 border-t border-border text-xs text-muted-foreground">
            Based on {lipaCountyRules.length} active fee rule(s). Revenue is settled per the FeeRule split logic.
          </div>
        </div>
      </div>
    </div>
  );
}
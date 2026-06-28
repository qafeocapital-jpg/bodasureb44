import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatKES, formatDate } from '@/lib/format';
import { auditLog } from '@/lib/audit';
import {
  ShieldCheck, AlertCircle, Clock, BadgeCheck, Send, Loader2,
  Calendar, Plus, X,
} from 'lucide-react';

export default function CountyCompliance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [permits, setPermits] = useState([]);
  const [subCounties, setSubCounties] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [riders, setRiders] = useState([]);
  const [permitFilter, setPermitFilter] = useState('all');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({ vehicle_id: '', billing_cycle: 'weekly', start_date: new Date().toISOString().split('T')[0] });
  const [issuing, setIssuing] = useState(false);
  const [sending, setSending] = useState(null);

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const vehicleFilter = countyId ? { county_id: countyId, status: 'approved' } : { status: 'approved' };
      const permitFilter = countyId ? { county_id: countyId } : {};
      const [v, p, sc, pens, r] = await Promise.all([
        base44.entities.Vehicle.filter(vehicleFilter),
        base44.entities.Permit.filter(permitFilter, '-created_date', 100),
        countyId ? base44.entities.SubCounty.filter({ county_id: countyId }).catch(() => []) : Promise.resolve([]),
        base44.entities.Penalty.filter(countyId ? { county_id: countyId } : {}, '-created_date', 50),
        base44.entities.User.filter(countyId ? { county_id: countyId, staff_type: 'none' } : { staff_type: 'none' }),
      ]);
      setVehicles(v); setPermits(p); setSubCounties(sc); setPenalties(pens); setRiders(r);
    } catch (e) { console.error('Compliance load error:', e); }
    setLoading(false);
  }

  const now = new Date();
  const activePermitVehicleIds = new Set(
    permits.filter(p => p.status === 'active' && (!p.end_date || new Date(p.end_date) > now)).map(p => p.vehicle_id)
  );
  const compliantCount = vehicles.filter(v => activePermitVehicleIds.has(v.id)).length;
  const complianceRate = vehicles.length > 0 ? Math.round((compliantCount / vehicles.length) * 100) : 0;

  const behindOnFees = vehicles.filter(v => !activePermitVehicleIds.has(v.id)).length;
  const provisionalHolders = permits.filter(p => p.permit_type === 'provisional' && p.status === 'active').length;
  const lapsedOrSuspended = riders.filter(r => ['SUSPENDED', 'DEACTIVATED', 'KYC_REJECTED'].includes(r.account_state)).length;

  // Sub-county compliance breakdown
  const subCountyBreakdown = subCounties.map(sc => {
    const scVehicles = vehicles.filter(v => v.sub_county_id === sc.id);
    const scCompliant = scVehicles.filter(v => activePermitVehicleIds.has(v.id)).length;
    return { ...sc, total: scVehicles.length, compliant: scCompliant, rate: scVehicles.length > 0 ? Math.round((scCompliant / scVehicles.length) * 100) : 0 };
  });

  // Non-compliant riders
  const riderMap = new Map(riders.map(r => [r.id, r]));
  const nonCompliant = vehicles.filter(v => !activePermitVehicleIds.has(v.id)).map(v => {
    const vehiclePermits = permits.filter(p => p.vehicle_id === v.id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    const mostRecent = vehiclePermits[0];
    const isExpired = mostRecent && (mostRecent.status === 'expired' || (mostRecent.end_date && new Date(mostRecent.end_date) < now));
    const daysOverdue = mostRecent?.end_date
      ? Math.floor((now - new Date(mostRecent.end_date)) / (1000 * 60 * 60 * 24))
      : null;
    const riderPenalty = penalties.find(pen => pen.vehicle_id === v.id && pen.status === 'pending');
    return {
      id: v.id,
      plate: v.plate_number,
      riderName: riderMap.get(v.rider_id)?.full_name || 'Unknown',
      riderId: v.rider_id,
      reason: !mostRecent ? 'No permit' : isExpired ? 'Permit lapsed' : 'Permit cancelled',
      daysOverdue,
      amountOwed: riderPenalty?.amount_cents || 0,
    };
  });

  async function sendNotify(item) {
    if (!item.riderId) return;
    setSending(item.id);
    try {
      const rider = await base44.entities.User.get(item.riderId);
      if (!rider?.phone) {
        toast({ title: 'No phone', description: 'Rider has no phone number.', variant: 'destructive' });
        return;
      }
      await base44.functions.invoke('sendSms', {
        phone: rider.phone,
        message: `Hello ${rider.full_name || 'Rider'}, your bodaboda permit for ${item.plate} is not active. Please renew via BodaSure to remain compliant.`,
        templateKey: 'compliance_reminder',
        eventType: 'compliance_reminder',
      });
      toast({ title: 'Notification sent', description: `SMS sent to ${rider.full_name}` });
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setSending(null);
  }

  async function issuePermit() {
    if (!issueForm.vehicle_id || !issueForm.billing_cycle) return;
    const vehicle = vehicles.find(v => v.id === issueForm.vehicle_id);
    if (!vehicle) return;
    setIssuing(true);
    try {
      const u = await base44.auth.me();
      const startDate = new Date(issueForm.start_date || new Date());
      const cycleDays = { weekly: 7, monthly: 30, quarterly: 90, yearly: 365 };
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (cycleDays[issueForm.billing_cycle] || 30));
      const ts = Date.now().toString();
      const permit = await base44.entities.Permit.create({
        vehicle_id: issueForm.vehicle_id,
        rider_id: vehicle.rider_id || vehicle.owner_id || '',
        county_id: countyId || vehicle.county_id || 'general',
        billing_cycle: issueForm.billing_cycle,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        issued_manually: true,
        qr_code_data: `BODASURE-${issueForm.vehicle_id}-${ts}`,
      });
      await auditLog({ userId: u.id, action: 'permit_issued_manual', entityType: 'Permit', entityId: permit.id, description: `Manual permit issued for vehicle ${vehicle.plate_number}` });
      toast({ title: 'Permit Issued', description: `${vehicle.plate_number} — ${issueForm.billing_cycle}` });
      setShowIssueModal(false);
      setIssueForm({ vehicle_id: '', billing_cycle: 'weekly', start_date: new Date().toISOString().split('T')[0] });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setIssuing(false);
  }

  // Filter permits for register tab
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const filteredPermits = permits.filter(p => {
    if (permitFilter === 'all') return true;
    if (permitFilter === 'full') return p.permit_type === 'full';
    if (permitFilter === 'provisional') return p.permit_type === 'provisional';
    if (permitFilter === 'expiring') return p.status === 'active' && p.end_date && new Date(p.end_date) > now && new Date(p.end_date) <= sevenDaysFromNow;
    if (permitFilter === 'revoked') return p.status === 'cancelled';
    return true;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ShieldCheck },
    { id: 'noncompliant', label: 'Non-Compliant', icon: AlertCircle },
    { id: 'permits', label: 'Permits', icon: BadgeCheck },
  ];

  const filterChips = [
    { id: 'all', label: 'All' },
    { id: 'full', label: 'Full' },
    { id: 'provisional', label: 'Provisional' },
    { id: 'expiring', label: 'Expiring' },
    { id: 'revoked', label: 'Revoked' },
  ];

  const cards = [
    { label: 'Fully Compliant', value: compliantCount, icon: BadgeCheck, color: 'bg-green-50 text-green-600' },
    { label: 'Behind on Fees', value: behindOnFees, icon: AlertCircle, color: 'bg-red-50 text-red-600' },
    { label: 'Lapsed/Suspended', value: lapsedOrSuspended, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Provisional Holders', value: provisionalHolders, icon: ShieldCheck, color: 'bg-orange-50 text-[#ff5a1f]' },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Compliance</h1>
      <p className="text-sm text-muted-foreground mb-5">Monitor compliance across your county</p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-[#ff5a1f] text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : tab === 'overview' ? (
        <div className="space-y-5">
          {/* Compliance Rate Hero */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground">Overall Compliance Rate</p>
                <p className="text-3xl font-heading font-bold text-[#ff5a1f]">{complianceRate}%</p>
              </div>
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-orange-50">
                <ShieldCheck className="w-10 h-10 text-[#ff5a1f]" />
              </div>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-[#ff5a1f]" style={{ width: `${complianceRate}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{compliantCount} of {vehicles.length} approved vehicles have active permits</p>
          </div>

          {/* 4 Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map(card => (
              <div key={card.label} className="bg-card border border-border rounded-xl p-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-heading font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Sub-county breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-heading font-bold mb-4">Compliance by Sub-County</h2>
            {subCounties.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No sub-counties defined</p>
            ) : (
              <div className="space-y-3">
                {subCountyBreakdown.map(sc => (
                  <div key={sc.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{sc.name}</span>
                      <span className="text-muted-foreground">{sc.compliant}/{sc.total} ({sc.rate}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${sc.rate >= 75 ? 'bg-green-500' : sc.rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${sc.rate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : tab === 'noncompliant' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plate</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rider</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Days Overdue</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Amount Owed</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {nonCompliant.map(item => (
                <tr key={item.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-semibold">{item.plate}</td>
                  <td className="px-4 py-3">{item.riderName}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{item.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${item.daysOverdue !== null && item.daysOverdue > 30 ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                      {item.daysOverdue !== null ? `${item.daysOverdue} days` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">{item.amountOwed > 0 ? formatKES(item.amountOwed) : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => sendNotify(item)}
                      disabled={sending === item.id}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#ff5a1f] bg-orange-50 rounded-lg px-3 py-1.5 hover:bg-orange-100 disabled:opacity-50"
                    >
                      {sending === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Notify
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {nonCompliant.length === 0 && (
            <div className="text-center py-8">
              <BadgeCheck className="w-8 h-8 mx-auto text-success mb-2" />
              <p className="text-sm text-success font-medium">All vehicles compliant</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              {filterChips.map(chip => (
                <button
                  key={chip.id}
                  onClick={() => setPermitFilter(chip.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${permitFilter === chip.id ? 'bg-[#ff5a1f] text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowIssueModal(true)} className="flex items-center gap-1 bg-[#ff5a1f] text-white rounded-lg px-4 py-2 text-sm font-semibold">
              <Calendar className="w-4 h-4" /> Issue Manually
            </button>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Permit No.</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rider</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Issued</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Valid Through</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPermits.map(p => {
                  const rider = riderMap.get(p.rider_id);
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-accent/50">
                      <td className="px-4 py-3 font-mono text-xs">{p.qr_code_data || p.id.substring(0, 12)}</td>
                      <td className="px-4 py-3">{rider?.full_name || 'Unknown'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${p.permit_type === 'provisional' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                          {p.permit_type === 'provisional' ? 'Provisional' : 'Full'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(p.start_date)}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(p.end_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${p.status === 'active' ? 'bg-success/10 text-success' : p.status === 'cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>{p.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredPermits.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No permits found</p>}
          </div>

          {showIssueModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowIssueModal(false)} />
              <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-bold text-lg">Issue Permit Manually</h3>
                  <button onClick={() => setShowIssueModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Vehicle</label>
                    <select value={issueForm.vehicle_id} onChange={e => setIssueForm(f => ({ ...f, vehicle_id: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                      <option value="">Select approved vehicle</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Billing Cycle</label>
                    <select value={issueForm.billing_cycle} onChange={e => setIssueForm(f => ({ ...f, billing_cycle: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                    <input type="date" value={issueForm.start_date} onChange={e => setIssueForm(f => ({ ...f, start_date: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setShowIssueModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                    <button onClick={issuePermit} disabled={!issueForm.vehicle_id || issuing} className="flex-1 bg-[#ff5a1f] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                      {issuing ? 'Issuing...' : 'Issue Permit'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
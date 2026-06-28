import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatKES, formatKESShort, formatDateTime, formatDate } from '@/lib/format';
import { Landmark, TrendingUp, FileText, Banknote, AlertCircle, Send, Loader2 } from 'lucide-react';

function getMonthStart() { return new Date(new Date().getFullYear(), new Date().getMonth(), 1); }
function getLastMonthRange() {
  const now = new Date();
  return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 1) };
}
function getYtdStart() { return new Date(new Date().getFullYear(), 0, 1); }

export default function CountyRevenue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [arrears, setArrears] = useState([]);
  const [sending, setSending] = useState(null);
  const [kpiData, setKpiData] = useState({ thisMonth: 0, lastMonth: 0, ytd: 0, count: 0, byCycle: {} });

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const vehicleFilter = countyId ? { county_id: countyId } : {};
      const [vehicles, settlementsData] = await Promise.all([
        base44.entities.Vehicle.filter(vehicleFilter),
        base44.entities.Settlement.filter(
          countyId ? { entity_type: 'county', entity_id: countyId } : { entity_type: 'county' },
          '-created_date', 20
        ),
      ]);

      const vehicleIds = new Set(vehicles.map(v => v.id));
      const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

      // Paginate through all lipa_county transactions
      const scopedTxns = [];
      let skip = 0;
      while (true) {
        const batch = await base44.entities.Transaction.filter({ type: 'lipa_county' }, '-created_date', 50, skip);
        if (batch.length === 0) break;
        const matching = countyId ? batch.filter(t => !t.vehicle_id || vehicleIds.has(t.vehicle_id)) : batch;
        scopedTxns.push(...matching);
        if (batch.length < 50) break;
        skip += 50;
      }

      // Resolve rider names for transactions
      const riderIds = [...new Set(scopedTxns.map(t => t.user_id).filter(Boolean))];
      const riderData = await Promise.all(riderIds.slice(0, 50).map(id => base44.entities.User.get(id).catch(() => null)));
      const riderMap = new Map(riderData.filter(Boolean).map(r => [r.id, r]));

      const enrichedTxns = scopedTxns.map(t => ({
        ...t,
        riderName: riderMap.get(t.user_id)?.full_name || 'Unknown',
        plate: vehicleMap.get(t.vehicle_id)?.plate_number || '—',
      }));

      setTransactions(enrichedTxns);
      setSettlements(settlementsData);

      // Compute KPIs
      const completed = enrichedTxns.filter(t => t.status === 'completed');
      const monthStart = getMonthStart();
      const ytdStart = getYtdStart();
      const { start: lastMonthStart, end: lastMonthEnd } = getLastMonthRange();

      const thisMonth = completed.filter(t => new Date(t.created_date) >= monthStart).reduce((s, t) => s + (t.amount_cents || 0), 0);
      const lastMonth = completed.filter(t => new Date(t.created_date) >= lastMonthStart && new Date(t.created_date) < lastMonthEnd).reduce((s, t) => s + (t.amount_cents || 0), 0);
      const ytd = completed.filter(t => new Date(t.created_date) >= ytdStart).reduce((s, t) => s + (t.amount_cents || 0), 0);

      // By billing cycle
      const byCycle = ['weekly', 'monthly', 'quarterly', 'yearly'].reduce((acc, cycle) => {
        acc[cycle] = completed.filter(t => t.metadata?.billing_cycle === cycle || t.description?.includes(cycle)).reduce((s, t) => s + (t.amount_cents || 0), 0);
        return acc;
      }, {});

      setKpiData({ thisMonth, lastMonth, ytd, count: completed.length, byCycle });

      // Arrears: vehicles with no active permit or expired permit
      const permits = await base44.entities.Permit.filter(countyId ? { county_id: countyId } : {});
      const activePermitVehicleIds = new Set(
        permits.filter(p => p.status === 'active' && (!p.end_date || new Date(p.end_date) > new Date())).map(p => p.vehicle_id)
      );

      const arrearsList = [];
      for (const v of vehicles) {
        if (!activePermitVehicleIds.has(v.id)) {
          const vehiclePermits = permits.filter(p => p.vehicle_id === v.id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
          const mostRecent = vehiclePermits[0];
          const lastPermitDate = mostRecent?.end_date || mostRecent?.created_date;
          const daysOverdue = lastPermitDate
            ? Math.floor((Date.now() - new Date(lastPermitDate).getTime()) / (1000 * 60 * 60 * 24))
            : null;

          let riderName = 'Unknown';
          if (v.rider_id) {
            const rider = await base44.entities.User.get(v.rider_id).catch(() => null);
            if (rider) riderName = rider.full_name || 'Unknown';
          }

          arrearsList.push({ id: v.id, plate: v.plate_number, riderName, riderId: v.rider_id, lastPermitDate, daysOverdue });
        }
      }
      setArrears(arrearsList);
    } catch (e) { console.error('Revenue load error:', e); }
    setLoading(false);
  }

  async function sendReminder(arrearsItem) {
    if (!arrearsItem.riderId) {
      toast({ title: 'No rider linked', description: 'Cannot send reminder — no rider phone on file.', variant: 'destructive' });
      return;
    }
    setSending(arrearsItem.id);
    try {
      const rider = await base44.entities.User.get(arrearsItem.riderId);
      if (!rider?.phone) {
        toast({ title: 'No phone number', description: 'Rider has no phone number on file.', variant: 'destructive' });
        return;
      }
      await base44.functions.invoke('sendSms', {
        phone: rider.phone,
        message: `Hello ${rider.full_name || 'Rider'}, your bodaboda permit for ${arrearsItem.plate} has expired. Please renew via BodaSure to avoid penalties.`,
        templateKey: 'permit_reminder',
        eventType: 'permit_reminder',
      });
      toast({ title: 'Reminder sent', description: `SMS sent to ${rider.full_name || arrearsItem.plate}` });
    } catch (e) {
      toast({ title: 'Failed to send', description: e.message, variant: 'destructive' });
    }
    setSending(null);
  }

  const revenueChange = kpiData.lastMonth > 0 ? Math.round(((kpiData.thisMonth - kpiData.lastMonth) / kpiData.lastMonth) * 100) : null;
  const maxCycleValue = Math.max(...Object.values(kpiData.byCycle), 1);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'ledger', label: 'Ledger', icon: FileText },
    { id: 'settlements', label: 'Settlements', icon: Banknote },
    { id: 'arrears', label: 'Arrears', icon: AlertCircle },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Revenue</h1>
      <p className="text-sm text-muted-foreground mb-5">Track collections, settlements, and arrears</p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-[#ff5a1f] text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
            {t.id === 'arrears' && arrears.length > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === t.id ? 'bg-white/20' : 'bg-destructive/10 text-destructive'}`}>{arrears.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : tab === 'overview' ? (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-[#ff5a1f] mb-3"><Landmark className="w-5 h-5" /></div>
              <p className="text-2xl font-heading font-bold">{formatKESShort(kpiData.thisMonth)}</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-[#ff5a1f] mb-3"><TrendingUp className="w-5 h-5" /></div>
              <p className="text-2xl font-heading font-bold">{formatKESShort(kpiData.lastMonth)}</p>
              <p className="text-xs text-muted-foreground">Last Month {revenueChange !== null && `(${revenueChange >= 0 ? '+' : ''}${revenueChange}%)`}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-[#ff5a1f] mb-3"><FileText className="w-5 h-5" /></div>
              <p className="text-2xl font-heading font-bold">{formatKESShort(kpiData.ytd)}</p>
              <p className="text-xs text-muted-foreground">YTD Total</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-[#ff5a1f] mb-3"><Banknote className="w-5 h-5" /></div>
              <p className="text-2xl font-heading font-bold">{kpiData.count}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Billing Cycle Breakdown */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-heading font-bold mb-4">Revenue by Billing Cycle</h2>
              <div className="space-y-3">
                {['weekly', 'monthly', 'quarterly', 'yearly'].map(cycle => (
                  <div key={cycle}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium capitalize">{cycle}</span>
                      <span className="text-muted-foreground">{formatKESShort(kpiData.byCycle[cycle] || 0)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-[#ff5a1f]" style={{ width: `${Math.round(((kpiData.byCycle[cycle] || 0) / maxCycleValue) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Settlement Summary */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-heading font-bold mb-4">Settlement Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Settlements</p>
                  <p className="text-xl font-heading font-bold">{settlements.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Processed</p>
                  <p className="text-xl font-heading font-bold text-green-600">{settlements.filter(s => s.status === 'processed').length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Pending</p>
                  <p className="text-xl font-heading font-bold text-amber-600">{settlements.filter(s => s.status === 'pending').length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                  <p className="text-xl font-heading font-bold">{formatKESShort(settlements.reduce((s, x) => s + (x.amount_cents || 0), 0))}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : tab === 'ledger' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Rider</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Plate</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 100).map(t => (
                <tr key={t.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-mono text-xs">{t.reference || '—'}</td>
                  <td className="px-4 py-3 font-semibold">{formatKES(t.amount_cents)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{t.riderName}</td>
                  <td className="px-4 py-3 hidden sm:table-cell font-medium">{t.plate}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${t.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{t.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{formatDateTime(t.created_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No transactions yet</p>}
        </div>
      ) : tab === 'settlements' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Settlement ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Txn Count</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map(s => (
                <tr key={s.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-mono text-xs">{s.id.substring(0, 12)}...</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(s.settled_at || s.created_date)}</td>
                  <td className="px-4 py-3">{s.transaction_ids?.length || 0}</td>
                  <td className="px-4 py-3 font-semibold">{formatKES(s.amount_cents)}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${s.status === 'processed' ? 'bg-success/10 text-success' : s.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {settlements.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No settlements yet</p>}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plate</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rider</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Last Permit</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Days Overdue</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {arrears.map(a => (
                <tr key={a.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-semibold">{a.plate}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.riderName}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{a.lastPermitDate ? formatDate(a.lastPermitDate) : 'Never'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${a.daysOverdue !== null && a.daysOverdue > 30 ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                      {a.daysOverdue !== null ? `${a.daysOverdue} days` : 'No permit'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => sendReminder(a)}
                      disabled={sending === a.id}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#ff5a1f] bg-orange-50 rounded-lg px-3 py-1.5 hover:bg-orange-100 disabled:opacity-50"
                    >
                      {sending === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Remind
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {arrears.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 mx-auto text-success mb-2" />
              <p className="text-sm text-success font-medium">No arrears — all vehicles have active permits</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
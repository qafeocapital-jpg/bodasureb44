import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES, formatDateTime, formatDate } from '@/lib/format';
import { Landmark, TrendingUp, FileText, Banknote, AlertCircle } from 'lucide-react';

export default function CountyRevenue() {
  const { user } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [arrears, setArrears] = useState([]);
  const [loading, setLoading] = useState(true);

  const countyId = user?.scope_entity_id || user?.county_id;

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch county-scoped vehicles to filter transactions
      const vehicles = countyId ? await base44.entities.Vehicle.filter({ county_id: countyId }) : [];
      const vehicleIds = new Set(vehicles.map(v => v.id));

      // Paginate through all lipa_county transactions and filter to this county
      const scopedTxns = [];
      let skip = 0;
      const batchLimit = 50;
      while (true) {
        const batch = await base44.entities.Transaction.filter({ type: 'lipa_county' }, '-created_date', batchLimit, skip);
        if (batch.length === 0) break;
        const matching = countyId
          ? batch.filter(t => !t.vehicle_id || vehicleIds.has(t.vehicle_id))
          : batch;
        scopedTxns.push(...matching);
        if (batch.length < batchLimit) break;
        skip += batchLimit;
      }

      // Fetch county-scoped settlements
      const setts = await base44.entities.Settlement.filter(
        countyId ? { entity_type: 'county', entity_id: countyId } : { entity_type: 'county' },
        '-created_date', 20
      );

      // Compute arrears: vehicles with no active permit OR most recent permit expired
      const arrearsList = [];
      for (const v of vehicles) {
        const permits = await base44.entities.Permit.filter({ vehicle_id: v.id }, '-created_date', 5);
        const activePermits = permits.filter(p => p.status === 'active' && (!p.end_date || new Date(p.end_date) > new Date()));
        if (activePermits.length === 0) {
          const mostRecent = permits[0];
          const isExpired = mostRecent && (mostRecent.status === 'expired' || (mostRecent.end_date && new Date(mostRecent.end_date) < new Date()));
          if (isExpired || !mostRecent) {
            // Fetch rider/owner name
            let ownerName = 'Unknown';
            if (v.rider_id) {
              const riderUsers = await base44.entities.User.filter({ id: v.rider_id });
              if (riderUsers[0]) ownerName = riderUsers[0].full_name || 'Unknown';
            } else if (v.owner_id) {
              const ownerUsers = await base44.entities.User.filter({ id: v.owner_id });
              if (ownerUsers[0]) ownerName = ownerUsers[0].full_name || 'Unknown';
            }

            const lastPermitDate = mostRecent?.end_date || mostRecent?.created_date;
            const daysOverdue = lastPermitDate
              ? Math.floor((Date.now() - new Date(lastPermitDate).getTime()) / (1000 * 60 * 60 * 24))
              : null;

            arrearsList.push({
              id: v.id,
              plate: v.plate_number,
              ownerName,
              lastPermitDate,
              daysOverdue,
            });
          }
        }
      }

      setTransactions(scopedTxns);
      setSettlements(setts);
      setArrears(arrearsList);
    } catch (e) {}
    setLoading(false);
  }

  const totalRevenue = transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.amount_cents || 0), 0);

  const tabs = [
    { id: 'dashboard', label: 'Revenue', icon: TrendingUp },
    { id: 'ledger', label: 'Ledger', icon: FileText },
    { id: 'settlements', label: 'Settlements', icon: Banknote },
    { id: 'arrears', label: 'Arrears', icon: AlertCircle },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Revenue</h1>
      <p className="text-sm text-muted-foreground mb-5">Track collections and settlements</p>

      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-emerald-600 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
            {t.id === 'arrears' && arrears.length > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === t.id ? 'bg-white/20' : 'bg-destructive/10 text-destructive'}`}>{arrears.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : tab === 'dashboard' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 mb-3"><Landmark className="w-5 h-5" /></div>
              <p className="text-2xl font-heading font-bold">{formatKES(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 mb-3"><FileText className="w-5 h-5" /></div>
              <p className="text-2xl font-heading font-bold">{transactions.length}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-50 text-violet-600 mb-3"><Banknote className="w-5 h-5" /></div>
              <p className="text-2xl font-heading font-bold">{settlements.length}</p>
              <p className="text-xs text-muted-foreground">Settlements</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${arrears.length > 0 ? 'bg-destructive/10 text-destructive' : 'bg-amber-50 text-amber-600'}`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-2xl font-heading font-bold">{arrears.length}</p>
              <p className="text-xs text-muted-foreground">Arrears</p>
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-mono text-xs">{t.reference}</td>
                  <td className="px-4 py-3 font-semibold">{formatKES(t.amount_cents)}</td>
                  <td className="px-4 py-3"><span className="text-xs font-semibold text-success">{t.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDateTime(t.created_date)}</td>
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Bank Ref</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map(s => (
                <tr key={s.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-semibold">{formatKES(s.amount_cents)}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${s.status === 'processed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{s.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.bank_reference || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDateTime(s.settled_at || s.created_date)}</td>
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Owner/Rider</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Last Permit Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Days Overdue</th>
              </tr>
            </thead>
            <tbody>
              {arrears.map(a => (
                <tr key={a.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-semibold">{a.plate}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.ownerName}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{a.lastPermitDate ? formatDate(a.lastPermitDate) : 'Never'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${a.daysOverdue !== null && a.daysOverdue > 30 ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                      {a.daysOverdue !== null ? `${a.daysOverdue} days` : 'No permit'}
                    </span>
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
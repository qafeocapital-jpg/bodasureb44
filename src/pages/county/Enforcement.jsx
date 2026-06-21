import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatKES, formatDateTime, formatDate } from '@/lib/format';
import { ShieldAlert, QrCode, AlertCircle, FileText, Search } from 'lucide-react';

export default function CountyEnforcement() {
  const [tab, setTab] = useState('field_check');
  const [penalties, setPenalties] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [p, i, v] = await Promise.all([
        base44.entities.Penalty.filter({}, '-created_date', 20),
        base44.entities.Inspection.filter({}, '-created_date', 20),
        base44.entities.Vehicle.filter({ status: 'approved' }),
      ]);
      setPenalties(p); setInspections(i); setVehicles(v);
    } catch (e) {}
    setLoading(false);
  }

  async function handleSearch() {
    if (!searchQuery) return;
    const q = searchQuery.toLowerCase();
    const found = vehicles.find(v => v.plate_number.toLowerCase().includes(q));
    setSearchResult(found || null);
  }

  async function issuePenalty(vehicleId) {
    const u = await base44.auth.me();
    await base44.entities.Penalty.create({
      rider_id: searchResult?.rider_id || '',
      vehicle_id: vehicleId,
      county_id: searchResult?.county_id || '',
      amount_cents: 50000,
      reason: 'Non-compliance — no valid permit',
      status: 'pending',
      issued_by_id: u.id,
      issued_at: new Date().toISOString(),
    });
    load();
  }

  const tabs = [
    { id: 'field_check', label: 'Field Check', icon: QrCode },
    { id: 'penalties', label: 'Penalties', icon: AlertCircle },
    { id: 'inspections', label: 'Inspections', icon: FileText },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Enforcement</h1>
      <p className="text-sm text-muted-foreground mb-5">Field checks, penalties, and inspections</p>

      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-emerald-600 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : tab === 'field_check' ? (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-heading font-bold mb-3">Search Rider or Vehicle</h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter plate number or phone..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button onClick={handleSearch} className="bg-emerald-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold">Search</button>
            </div>

            {searchResult && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-heading font-bold">{searchResult.plate_number}</p>
                    <p className="text-xs text-muted-foreground">{searchResult.make} · {searchResult.color}</p>
                    <p className="text-xs text-muted-foreground mt-1">Status: <span className="font-semibold">{searchResult.status}</span></p>
                  </div>
                  <button onClick={() => issuePenalty(searchResult.id)} className="bg-destructive text-destructive-foreground rounded-lg px-4 py-2 text-xs font-semibold">
                    Issue Penalty
                  </button>
                </div>
              </div>
            )}
            {searchResult === null && searchQuery && (
              <p className="mt-4 text-sm text-destructive">No vehicle found matching "{searchQuery}"</p>
            )}
          </div>
        </div>
      ) : tab === 'penalties' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Issued</th>
              </tr>
            </thead>
            <tbody>
              {penalties.map(p => (
                <tr key={p.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-semibold">{formatKES(p.amount_cents)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.reason}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${p.status === 'paid' ? 'bg-success/10 text-success' : p.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{p.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(p.issued_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {penalties.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No penalties issued</p>}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Result</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map(i => (
                <tr key={i.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${i.result === 'compliant' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{i.result}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{i.notes || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDateTime(i.inspected_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {inspections.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No inspections recorded</p>}
        </div>
      )}
    </div>
  );
}
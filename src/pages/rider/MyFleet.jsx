import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES, formatDate } from '@/lib/format';
import { formatPlate } from '@/lib/plate';
import { ChevronLeft, Bike, Plus, ShieldCheck, ShieldAlert, FileText, Banknote, ChevronRight, X } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';

export default function MyFleet() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bikes, setBikes] = useState([]);
  const [permits, setPermits] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [riders, setRiders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBike, setSelectedBike] = useState(null);
  const [detailTab, setDetailTab] = useState('info');

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const [owned, allPermits, allPolicies, allTxs, myWallets] = await Promise.all([
          base44.entities.Vehicle.filter({ owner_id: user.id }),
          base44.entities.Permit.filter({}),
          base44.entities.Policy.filter({ rider_id: user.id }),
          base44.entities.Transaction.filter({ type: 'lipa_owner' }),
          base44.entities.Wallet.filter({ user_id: user.id, entity_type: 'personal' }),
        ]);
        setBikes(owned);
        setPermits(allPermits);
        setPolicies(allPolicies);
        setTransactions(allTxs);
        setWallets(myWallets);

        // Fetch rider names for assigned bikes
        const riderIds = [...new Set(owned.map(b => b.rider_id).filter(Boolean))];
        if (riderIds.length > 0) {
          const riderData = await Promise.all(riderIds.map(id => base44.entities.User.get(id).catch(() => null)));
          setRiders(riderData.filter(Boolean));
        }
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) return <PageSkeleton variant="hero-rows" />;

  const getBikePermit = (bikeId) => permits.filter(p => p.vehicle_id === bikeId).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
  const getBikePolicy = (bikeId) => policies.filter(p => p.vehicle_id === bikeId).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
  const getRiderName = (riderId) => riders.find(r => r.id === riderId)?.full_name || 'Unassigned';
  const getBikeEarnings = (bikeId) => transactions.filter(t => t.vehicle_id === bikeId && t.status === 'completed').reduce((sum, t) => sum + (t.amount_cents || 0), 0);
  const totalEarnings = transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.amount_cents || 0), 0);

  const isPermitActive = (bikeId) => {
    const p = getBikePermit(bikeId);
    if (!p || p.status !== 'active') return false;
    return new Date(p.end_date) > new Date();
  };
  const isPolicyActive = (bikeId) => {
    const p = getBikePolicy(bikeId);
    if (!p || p.status !== 'active') return false;
    return new Date(p.end_date) > new Date();
  };

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">My Fleet</h1>
      </div>

      {/* Earnings Summary */}
      <div className="bg-gradient-to-br from-primary to-orange-600 text-white rounded-2xl p-5 mb-5">
        <p className="text-xs text-orange-100 uppercase tracking-wide font-medium">Total Owner Earnings</p>
        <p className="text-3xl font-heading font-extrabold mt-1">{formatKES(totalEarnings)}</p>
        <p className="text-xs text-orange-100 mt-1">From lipa_owner payments received</p>
      </div>

      {/* Register New Bike */}
      <button
        onClick={() => navigate('/app/bikes/register')}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-3 text-sm font-semibold text-primary hover:bg-accent transition-colors mb-5"
      >
        <Plus className="w-4 h-4" /> Register New Bike
      </button>

      {/* Fleet Overview */}
      <h2 className="text-sm font-heading font-bold mb-3">Fleet Overview ({bikes.length} bikes)</h2>
      {bikes.length === 0 ? (
        <div className="bg-accent rounded-2xl p-6 text-center">
          <Bike className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No bikes registered yet. Register one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bikes.map(bike => {
            const permitActive = isPermitActive(bike.id);
            const policyActive = isPolicyActive(bike.id);
            return (
              <button
                key={bike.id}
                onClick={() => { setSelectedBike(bike); setDetailTab('info'); }}
                className="w-full bg-card border border-border rounded-2xl p-4 hover:bg-accent transition-colors text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                      <Bike className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-sm">{formatPlate(bike.plate_number)}</p>
                      <p className="text-xs text-muted-foreground">{bike.make} {bike.model} · {bike.color}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Rider: <span className="font-medium text-foreground">{getRiderName(bike.rider_id)}</span></span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 ${permitActive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {permitActive ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    {permitActive ? 'Permit Active' : 'Permit Expired'}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 ${policyActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {policyActive ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    {policyActive ? 'Insured' : 'No Insurance'}
                  </span>
                  {bike.logbook_url && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-blue-50 text-blue-600">
                      <FileText className="w-3 h-3" /> Logbook
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail Sheet */}
      {selectedBike && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedBike(null)} />
          <div className="relative w-full max-w-[512px] bg-card rounded-t-3xl pb-8 animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-card px-5 pt-5 pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-lg">{formatPlate(selectedBike.plate_number)}</h3>
                <button onClick={() => setSelectedBike(null)} className="p-1 rounded-lg hover:bg-accent">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{selectedBike.make} {selectedBike.model} · {selectedBike.color}</p>
              <div className="flex gap-2 mt-3">
                {['info', 'compliance', 'insurance', 'earnings'].map(t => (
                  <button
                    key={t}
                    onClick={() => setDetailTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${detailTab === t ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-5 py-4">
              {detailTab === 'info' && (
                <div className="space-y-3">
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Assigned Rider</p>
                    <p className="text-sm font-semibold">{getRiderName(selectedBike.rider_id)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-semibold capitalize">{selectedBike.status}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Logbook</p>
                    {selectedBike.logbook_url ? (
                      <a href={selectedBike.logbook_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary underline">View Logbook</a>
                    ) : (
                      <button className="text-sm font-semibold text-primary">Upload Logbook</button>
                    )}
                  </div>
                </div>
              )}
              {detailTab === 'compliance' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">Permit History</p>
                  {permits.filter(p => p.vehicle_id === selectedBike.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No permits recorded</p>
                  ) : (
                    permits.filter(p => p.vehicle_id === selectedBike.id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(p => (
                      <div key={p.id} className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold capitalize">{p.billing_cycle} permit</p>
                          <p className="text-xs text-muted-foreground">{formatDate(p.start_date)} → {formatDate(p.end_date)}</p>
                        </div>
                        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${p.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{p.status}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
              {detailTab === 'insurance' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">Insurance Policies</p>
                  {policies.filter(p => p.vehicle_id === selectedBike.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No insurance policies</p>
                  ) : (
                    policies.filter(p => p.vehicle_id === selectedBike.id).map(p => {
                      const daysLeft = Math.ceil((new Date(p.end_date) - new Date()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={p.id} className="bg-muted/50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold">Policy</p>
                            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${p.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{p.status}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatDate(p.start_date)} → {formatDate(p.end_date)}</p>
                          {p.status === 'active' && <p className={`text-xs font-medium mt-1 ${daysLeft < 7 ? 'text-destructive' : 'text-muted-foreground'}`}>{daysLeft} days remaining</p>}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
              {detailTab === 'earnings' && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-primary/10 to-orange-50 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground">Earnings from this bike</p>
                    <p className="text-2xl font-heading font-bold text-primary">{formatKES(getBikeEarnings(selectedBike.id))}</p>
                    <p className="text-xs text-muted-foreground mt-1">Lipa_owner payments received</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Recent Transactions</p>
                  {transactions.filter(t => t.vehicle_id === selectedBike.id).slice(0, 10).map(t => (
                    <div key={t.id} className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{formatKES(t.amount_cents)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(t.created_date)}</p>
                      </div>
                      <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${t.status === 'completed' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{t.status}</span>
                    </div>
                  ))}
                  {transactions.filter(t => t.vehicle_id === selectedBike.id).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
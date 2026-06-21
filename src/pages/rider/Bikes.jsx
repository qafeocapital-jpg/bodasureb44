import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES, timeAgo } from '@/lib/format';
import { getOrCreateWallet } from '@/lib/mockPayments';
import { Plus, Bike as BikeIcon, BadgeCheck, Clock, ChevronRight, QrCode, UserCheck, TrendingUp } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';

export default function Bikes() {
  const { user } = useAuth();
  const [bikes, setBikes] = useState([]);
  const [ownedBikes, setOwnedBikes] = useState([]);
  const [ownerTxns, setOwnerTxns] = useState([]);
  const [activeTab, setActiveTab] = useState('my');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const w = await getOrCreateWallet(user.id);
        const [owned, ridden, txns] = await Promise.all([
          base44.entities.Vehicle.filter({ owner_id: user.id }),
          base44.entities.Vehicle.filter({ rider_id: user.id }),
          base44.entities.Transaction.filter({ type: 'lipa_owner', counterparty_wallet_id: w.id }, '-created_date', 20),
        ]);
        const merged = [...owned, ...ridden.filter(r => !owned.find(o => o.id === r.id))];
        setBikes(merged);
        setOwnedBikes(owned.filter(b => b.rider_id && b.rider_id !== user.id));
        setOwnerTxns(txns);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalReceivedThisMonth = ownerTxns
    .filter(t => t.status === 'completed' && new Date(t.created_date) >= monthStart)
    .reduce((sum, t) => sum + (t.amount_cents || 0), 0);

  if (loading) return <PageSkeleton variant="hero-rows" />;

  const tabs = [
    { id: 'my', label: 'My Bikes' },
    { id: 'owner', label: 'Owner' },
  ];

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-heading font-bold">My Bikes</h1>
        <Link to="/app/bikes/register" className="flex items-center gap-1 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-semibold">
          <Plus className="w-4 h-4" /> Register
        </Link>
      </div>

      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === t.id ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'my' ? (
        bikes.length === 0 ? (
          <div className="bg-accent rounded-2xl p-8 text-center">
            <BikeIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No bikes registered yet. Register your bike to get started.</p>
            <Link to="/app/bikes/register" className="inline-flex items-center gap-1 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold">
              <Plus className="w-4 h-4" /> Register Bike
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bikes.map(bike => (
              <Link key={bike.id} to={`/app/bikes/${bike.id}/certificate`} className="block bg-card border border-border rounded-2xl p-4 hover:bg-accent transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                      <BikeIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-base">{bike.plate_number}</p>
                      <p className="text-xs text-muted-foreground">{bike.make} · {bike.color}</p>
                    </div>
                  </div>
                  {bike.status === 'approved' ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-success bg-success/10 rounded-full px-2.5 py-1">
                      <BadgeCheck className="w-3.5 h-3.5" /> Approved
                    </span>
                  ) : bike.status === 'pending' ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-warning bg-warning/10 rounded-full px-2.5 py-1">
                      <Clock className="w-3.5 h-3.5" /> Pending
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-destructive bg-destructive/10 rounded-full px-2.5 py-1">Rejected</span>
                  )}
                </div>
                {bike.status === 'approved' && (
                  <div className="flex items-center gap-1 mt-3 text-xs text-primary font-medium">
                    <QrCode className="w-3.5 h-3.5" /> View Certificate <ChevronRight className="w-3 h-3" />
                  </div>
                )}
              </Link>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-primary to-orange-600 text-primary-foreground rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-orange-100" />
              <p className="text-xs text-orange-100 uppercase tracking-wide font-medium">Received This Month</p>
            </div>
            <p className="text-3xl font-heading font-extrabold">{formatKES(totalReceivedThisMonth)}</p>
          </div>

          <div>
            <h2 className="text-sm font-heading font-bold mb-3 flex items-center gap-2">
              <BikeIcon className="w-4 h-4" /> Bikes Rented Out ({ownedBikes.length})
            </h2>
            {ownedBikes.length === 0 ? (
              <div className="bg-accent rounded-xl p-6 text-center">
                <p className="text-sm text-muted-foreground">No bikes where you're the owner but someone else rides.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ownedBikes.map(bike => (
                  <Link key={bike.id} to={`/app/bikes/${bike.id}/certificate`} className="block bg-card border border-border rounded-xl p-3 hover:bg-accent transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                          <BikeIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-heading font-bold text-sm">{bike.plate_number}</p>
                          <p className="text-xs text-muted-foreground">{bike.make} {bike.model}</p>
                        </div>
                      </div>
                      {bike.status === 'approved' ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-success bg-success/10 rounded-full px-2 py-0.5">
                          <BadgeCheck className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5 capitalize">{bike.status}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-heading font-bold mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Incoming Payments ({ownerTxns.length})
            </h2>
            {ownerTxns.length === 0 ? (
              <div className="bg-accent rounded-xl p-6 text-center">
                <p className="text-sm text-muted-foreground">No incoming payments yet. Riders paying you via Lipa Owner will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ownerTxns.map(tx => (
                  <div key={tx.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Owner Payment</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(tx.created_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-success">+{formatKES(tx.amount_cents)}</p>
                      <span className="text-[10px] text-success font-medium">{tx.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
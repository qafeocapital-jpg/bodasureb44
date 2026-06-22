import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';

export default function Compliance() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
          const wallets = await base44.entities.Wallet.filter({ user_id: user.id, entity_type: 'personal' });
          const wallet = wallets[0];
          const walletActive = wallet?.status === 'active';
          const checks = [
            { label: 'Profile Complete', done: user.profile_complete, link: '/app/profile' },
            { label: 'Wallet Activated', done: walletActive, link: '/app/wallet/activate' },
            { label: 'KYC Documents Uploaded', done: user.kyc_status === 'approved' || user.kyc_status === 'pending', pending: user.kyc_status === 'pending', link: '/app/kyc' },
            { label: 'KYC Approved (Tier 2)', done: user.kyc_status === 'approved', link: '/app/kyc' },
          ];
          const bikes = await base44.entities.Vehicle.filter({ rider_id: user.id });
          const approvedBike = bikes.find(b => b.status === 'approved');
          checks.push(
            { label: 'Bike Registered', done: bikes.length > 0, link: '/app/bikes/register' },
            { label: 'Bike Approved', done: !!approvedBike, link: '/app/bikes' },
          );
          if (approvedBike) {
            const permits = await base44.entities.Permit.filter({ vehicle_id: approvedBike.id, status: 'active' });
            checks.push({ label: 'Active Permit', done: permits.length > 0, link: '/app/lipa-county' });
            const policies = await base44.entities.Policy.filter({ vehicle_id: approvedBike.id, status: 'active' });
            checks.push({ label: 'Active Insurance', done: policies.length > 0, link: '/app/insurance' });
          }
          setItems(checks);
          } catch (e) {}
          setLoading(false);
          }
    load();
  }, [user]);

  if (loading) return <PageSkeleton variant="hero-rows" />;

  const completed = items.filter(i => i.done).length;
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  return (
    <div className="p-5 animate-fade-in">
      <h1 className="text-xl font-heading font-bold mb-5">Compliance</h1>

      <div className="bg-gradient-to-br from-primary to-orange-600 text-primary-foreground rounded-2xl p-5 mb-5">
        <p className="text-xs text-orange-100 uppercase tracking-wide font-medium">Compliance Score</p>
        <p className="text-3xl font-heading font-extrabold mt-1">{pct}%</p>
        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-orange-100 mt-2">{completed} of {items.length} requirements met</p>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <Link
            key={i}
            to={item.link}
            className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              {item.done ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : item.pending ? (
                <Clock className="w-5 h-5 text-warning" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {!item.done && !item.pending && (
              <span className="text-xs text-primary font-semibold">Fix →</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
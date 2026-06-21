import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Plus, Bike as BikeIcon, BadgeCheck, Clock, ChevronRight, QrCode } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';

export default function Bikes() {
  const { user } = useAuth();
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const owned = await base44.entities.Vehicle.filter({ owner_id: user.id });
        const ridden = await base44.entities.Vehicle.filter({ rider_id: user.id });
        const merged = [...owned, ...ridden.filter(r => !owned.find(o => o.id === r.id))];
        setBikes(merged);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-heading font-bold">My Bikes</h1>
        <Link to="/app/bikes/register" className="flex items-center gap-1 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-semibold">
          <Plus className="w-4 h-4" /> Register
        </Link>
      </div>

      {loading ? (
        <PageSkeleton variant="hero-rows" />
      ) : bikes.length === 0 ? (
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
      )}
    </div>
  );
}
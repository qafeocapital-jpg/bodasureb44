import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDate } from '@/lib/format';
import { Bike, BadgeCheck, Clock, XCircle } from 'lucide-react';
import BikeDetailSheet from '@/components/BikeDetailSheet';

export default function SaccoBikes() {
  const { user } = useAuth();
  const [bikes, setBikes] = useState([]);
  const [riders, setRiders] = useState({});
  const [loading, setLoading] = useState(true);
  const [detailVehicleId, setDetailVehicleId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const countyId = user?.county_id;
        const b = countyId
          ? await base44.entities.Vehicle.filter({ county_id: countyId })
          : await base44.entities.Vehicle.filter({});
        setBikes(b);

        const riderIds = [...new Set(b.map(v => v.rider_id).filter(Boolean))];
        if (riderIds.length > 0) {
          const riderMap = {};
          await Promise.all(riderIds.map(async rid => {
            try {
              const r = await base44.entities.User.filter({ id: rid });
              if (r.length > 0) riderMap[rid] = r[0];
            } catch (e) {}
          }));
          setRiders(riderMap);
        }
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Bikes</h1>
      <p className="text-sm text-muted-foreground mb-5">Member vehicles in SACCO</p>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : bikes.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Bike className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No bikes registered</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bikes.map(b => (
            <div key={b.id} onClick={() => setDetailVehicleId(b.id)} className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:bg-accent transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center"><Bike className="w-5 h-5 text-orange-600" /></div>
                  <div>
                    <p className="font-heading font-bold text-sm">{b.plate_number}</p>
                    <p className="text-xs text-muted-foreground">{b.make} {b.model}</p>
                  </div>
                </div>
                {b.status === 'approved' ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-success bg-success/10 rounded-full px-2 py-0.5">
                    <BadgeCheck className="w-3 h-3" /> Approved
                  </span>
                ) : b.status === 'pending' ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-warning bg-warning/10 rounded-full px-2 py-0.5">
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-destructive bg-destructive/10 rounded-full px-2 py-0.5">
                    <XCircle className="w-3 h-3" /> Rejected
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Rider: {riders[b.rider_id]?.full_name || '—'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Registered: {formatDate(b.created_date)}</p>
            </div>
          ))}
        </div>
      )}

      {detailVehicleId && (
        <BikeDetailSheet vehicleId={detailVehicleId} onClose={() => setDetailVehicleId(null)} isStaff accent="blue" />
      )}
    </div>
  );
}
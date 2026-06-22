import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Phone, Mail, ShieldCheck, Bike, BadgeCheck, Loader2 } from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/phone';
import { formatDate } from '@/lib/format';
import KycLevelBadge from '@/components/ui/KycLevelBadge';

export default function RiderDetailSheet({ riderId, onClose }) {
  const [rider, setRider] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [activePermitCount, setActivePermitCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!riderId) return;
    async function load() {
      setLoading(true);
      try {
        const users = await base44.entities.User.filter({ id: riderId });
        const r = users[0];
        setRider(r);

        const [wallets, owned, ridden] = await Promise.all([
          base44.entities.Wallet.filter({ user_id: riderId, entity_type: 'personal' }),
          base44.entities.Vehicle.filter({ owner_id: riderId }),
          base44.entities.Vehicle.filter({ rider_id: riderId }),
        ]);
        setWallet(wallets[0] || null);
        const merged = [...owned, ...ridden.filter(v => !owned.find(o => o.id === v.id))];
        setVehicles(merged);

        // Count active permits across all vehicles
        let permitCount = 0;
        for (const v of merged) {
          const perms = await base44.entities.Permit.filter({ vehicle_id: v.id, status: 'active' });
          permitCount += perms.length;
        }
        setActivePermitCount(permitCount);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [riderId]);

  if (!riderId) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[512px] bg-card rounded-t-3xl p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg">{rider?.full_name || 'Rider Detail'}</h3>
              <p className="text-xs text-muted-foreground">Read-only county view</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : !rider ? (
          <p className="text-sm text-muted-foreground text-center py-8">Rider not found</p>
        ) : (
          <div className="space-y-4">
            {/* Contact Info */}
            <div className="bg-accent rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{rider.phone ? formatPhoneDisplay(rider.phone) : 'No phone'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{rider.email || 'No email'}</span>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="bg-card border border-border rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted-foreground mb-1">Verification</p>
                <KycLevelBadge user={rider} wallet={wallet} size="lg" />
              </div>
              <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-3 py-2">
                <BadgeCheck className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Active Permits</p>
                  <span className="text-xs font-semibold">{activePermitCount}</span>
                </div>
              </div>
            </div>

            {/* Vehicles */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Bike className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-heading font-bold">Vehicles ({vehicles.length})</h4>
              </div>
              {vehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 bg-accent rounded-xl">No vehicles registered</p>
              ) : (
                <div className="space-y-2">
                  {vehicles.map(v => (
                    <div key={v.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{v.plate_number}</p>
                        <p className="text-xs text-muted-foreground">{v.make} {v.model} · {v.color}</p>
                      </div>
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                        v.status === 'approved' ? 'bg-success/10 text-success'
                        : v.status === 'pending' ? 'bg-warning/10 text-warning'
                        : 'bg-destructive/10 text-destructive'
                      }`}>{v.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground pt-2">Joined: {formatDate(rider.created_date)}</p>
          </div>
        )}

        <button onClick={onClose} className="w-full mt-5 bg-emerald-600 text-white rounded-xl py-3 font-semibold text-sm">
          Close
        </button>
      </div>
    </div>
  );
}
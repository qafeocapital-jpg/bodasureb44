import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import { Users } from 'lucide-react';
import BikeDetailSheet from '@/components/BikeDetailSheet';
import { formatPhoneDisplay } from '@/lib/phone';

export default function StageMembers() {
  const [members, setMembers] = useState([]);
  const [bikeByRider, setBikeByRider] = useState({});
  const [loading, setLoading] = useState(true);
  const [detailVehicleId, setDetailVehicleId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const u = await base44.auth.me();
        if (u?.scope_entity_id) {
          const [m, b] = await Promise.all([
            base44.entities.User.filter({ stage_id: u.scope_entity_id, staff_type: 'none' }),
            base44.entities.Vehicle.filter({ stage_id: u.scope_entity_id }),
          ]);
          setMembers(m);
          const bikeMap = {};
          b.forEach(v => {
            const riderId = v.rider_id || v.owner_id;
            if (riderId && !bikeMap[riderId]) bikeMap[riderId] = v;
          });
          setBikeByRider(bikeMap);
        }
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Members</h1>
      <p className="text-sm text-muted-foreground mb-5">Riders at your stage</p>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : members.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No members at this stage</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bike</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">{m.full_name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{m.phone ? formatPhoneDisplay(m.phone) : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(m.created_date)}</td>
                  <td className="px-4 py-3">
                    {bikeByRider[m.id] ? (
                      <button onClick={() => setDetailVehicleId(bikeByRider[m.id].id)} className="text-xs text-blue-600 font-semibold hover:underline">View Bike</button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailVehicleId && (
        <BikeDetailSheet vehicleId={detailVehicleId} onClose={() => setDetailVehicleId(null)} isStaff accent="blue" />
      )}
    </div>
  );
}
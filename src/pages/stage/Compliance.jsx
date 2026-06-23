import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { BadgeCheck, AlertCircle } from 'lucide-react';

export default function StageCompliance() {
  const [members, setMembers] = useState([]);
  const [bikes, setBikes] = useState([]);
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const u = await base44.auth.me();
        if (u?.scope_entity_id) {
          const [m, b, p] = await Promise.all([
            base44.entities.User.filter({ stage_id: u.scope_entity_id, staff_type: 'none' }),
            base44.entities.Vehicle.filter({ stage_id: u.scope_entity_id }),
            base44.entities.Permit.filter({ status: 'active' }),
          ]);
          setMembers(m);
          setBikes(b);
          setPermits(p);
        }
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, []);

  const compliantVehicleIds = new Set(permits.map(p => p.vehicle_id));
  const compliant = bikes.filter(b => compliantVehicleIds.has(b.id)).length;
  const nonCompliant = bikes.length - compliant;
  const compliantRiderIds = new Set(bikes.filter(b => compliantVehicleIds.has(b.id)).map(b => b.rider_id).filter(Boolean));

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Compliance</h1>
      <p className="text-sm text-muted-foreground mb-5">Stage compliance overview</p>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-success/10 text-success mb-3"><BadgeCheck className="w-5 h-5" /></div>
          <p className="text-2xl font-heading font-bold">{compliant}</p>
          <p className="text-xs text-muted-foreground">Compliant</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-destructive/10 text-destructive mb-3"><AlertCircle className="w-5 h-5" /></div>
          <p className="text-2xl font-heading font-bold">{nonCompliant}</p>
          <p className="text-xs text-muted-foreground">Non-Compliant</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rider</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => {
              const isCompliant = compliantRiderIds.has(m.id);
              return (
                <tr key={m.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">{m.full_name || 'Unknown'}</td>
                  <td className="px-4 py-3">
                    {isCompliant ? (
                      <span className="text-xs font-semibold text-success bg-success/10 rounded-full px-2 py-0.5">Compliant</span>
                    ) : (
                      <span className="text-xs font-semibold text-destructive bg-destructive/10 rounded-full px-2 py-0.5">Non-Compliant</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
          {members.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No members</p>}
      </div>
    </div>
  );
}
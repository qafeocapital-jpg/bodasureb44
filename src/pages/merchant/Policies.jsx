import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDate } from '@/lib/format';
import { ShieldCheck } from 'lucide-react';

export default function MerchantPolicies() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const merchantId = user?.merchant_id || user?.scope_entity_id;
        const p = merchantId
          ? await base44.entities.Policy.filter({ merchant_id: merchantId }, '-created_date', 50)
          : await base44.entities.Policy.filter({}, '-created_date', 50);
        setPolicies(p);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Policies</h1>
      <p className="text-sm text-muted-foreground mb-5">Sold insurance policies</p>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : policies.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No policies sold yet</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Start</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">End</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {policies.map(p => (
                <tr key={p.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-mono text-xs">{p.vehicle_id?.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(p.start_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(p.end_date)}</td>
                  <td className="px-4 py-3"><span className="text-xs font-semibold text-success bg-success/10 rounded-full px-2 py-0.5">{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
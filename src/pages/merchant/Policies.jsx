import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDate, formatKES } from '@/lib/format';
import { ShieldCheck } from 'lucide-react';

export default function MerchantPolicies() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [enriched, setEnriched] = useState([]);
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

        // Enrich: fetch vehicles, products, and riders
        const vehicleIds = [...new Set(p.map(pol => pol.vehicle_id).filter(Boolean))];
        const productIds = [...new Set(p.map(pol => pol.product_id).filter(Boolean))];
        const riderIds = [...new Set(p.map(pol => pol.rider_id).filter(Boolean))];

        const [vehicles, products, riders] = await Promise.all([
          Promise.all(vehicleIds.map(id => base44.entities.Vehicle.filter({ id }).then(r => r[0]))),
          Promise.all(productIds.map(id => base44.entities.InsuranceProduct.filter({ id }).then(r => r[0]))),
          Promise.all(riderIds.map(id => base44.entities.User.filter({ id }).then(r => r[0]))),
        ]);

        const vehicleMap = new Map(vehicles.filter(Boolean).map(v => [v.id, v]));
        const productMap = new Map(products.filter(Boolean).map(pr => [pr.id, pr]));
        const riderMap = new Map(riders.filter(Boolean).map(r => [r.id, r]));

        const enrichedData = p.map(pol => ({
          ...pol,
          vehicle: vehicleMap.get(pol.vehicle_id) || null,
          product: productMap.get(pol.product_id) || null,
          rider: riderMap.get(pol.rider_id) || null,
        }));
        setEnriched(enrichedData);
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
      ) : enriched.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No policies sold yet</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rider</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Product</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Premium</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Valid Until</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map(p => (
                <tr key={p.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">{p.rider?.full_name || 'Unknown'}</td>
                  <td className="px-4 py-3 font-semibold">{p.vehicle?.plate_number || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{p.product?.name || 'Unknown product'}</td>
                  <td className="px-4 py-3 font-semibold">{formatKES(p.premium_cents)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(p.end_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                      p.status === 'active' ? 'bg-success/10 text-success'
                      : p.status === 'expired' ? 'bg-warning/10 text-warning'
                      : 'bg-destructive/10 text-destructive'
                    }`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import { Bike } from 'lucide-react';

export default function SaccoBikes() {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const b = await base44.entities.Vehicle.filter({ status: 'approved' });
        setBikes(b);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, []);

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
            <div key={b.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center"><Bike className="w-5 h-5 text-orange-600" /></div>
                <div><p className="font-heading font-bold text-sm">{b.plate_number}</p><p className="text-xs text-muted-foreground">{b.make}</p></div>
              </div>
              <p className="text-xs text-muted-foreground">Registered: {formatDate(b.created_date)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
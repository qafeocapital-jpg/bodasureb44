import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatKES, formatDate } from '@/lib/format';
import { Banknote, Check } from 'lucide-react';

export default function SaccoSettlements() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const s = await base44.entities.Settlement.filter({ entity_type: 'sacco' }, '-created_date', 20);
        setSettlements(s);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, []);

  async function markPaid(id) {
    await base44.entities.Settlement.update(id, { status: 'processed', settled_at: new Date().toISOString() });
    const s = await base44.entities.Settlement.filter({ entity_type: 'sacco' }, '-created_date', 20);
    setSettlements(s);
  }

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Settlements</h1>
      <p className="text-sm text-muted-foreground mb-5">SACCO's share of permit fees</p>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : settlements.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Banknote className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No settlements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {settlements.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-heading font-bold text-sm">{formatKES(s.amount_cents)}</p>
                <p className="text-xs text-muted-foreground">{formatDate(s.created_date)}</p>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 mt-1 inline-block ${s.status === 'processed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{s.status}</span>
              </div>
              {s.status !== 'processed' && (
                <button onClick={() => markPaid(s.id)} className="flex items-center gap-1 bg-success text-success-foreground rounded-lg px-4 py-2 text-xs font-semibold">
                  <Check className="w-4 h-4" /> Mark Paid
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
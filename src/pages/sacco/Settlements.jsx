import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { auditLog } from '@/lib/audit';
import { useToast } from '@/components/ui/use-toast';
import { formatKES, formatDate } from '@/lib/format';
import { Banknote, Check } from 'lucide-react';

export default function SaccoSettlements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  const saccoGroupId = user?.scope_entity_id;

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const filter = saccoGroupId
          ? { entity_type: 'sacco', entity_id: saccoGroupId }
          : { entity_type: 'sacco' };
        const s = await base44.entities.Settlement.filter(filter, '-created_date', 20);
        setSettlements(s);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  async function markPaid(id) {
    try {
      await base44.entities.Settlement.update(id, { status: 'processed', settled_at: new Date().toISOString() });
      await auditLog({ userId: user.id, action: 'settlement_marked_paid', entityType: 'Settlement', entityId: id, description: 'SACCO settlement marked as paid' });
      toast({ title: 'Settlement marked as paid' });
      const filter = saccoGroupId
        ? { entity_type: 'sacco', entity_id: saccoGroupId }
        : { entity_type: 'sacco' };
      const s = await base44.entities.Settlement.filter(filter, '-created_date', 20);
      setSettlements(s);
    } catch (e) {
      toast({ title: 'Failed to update settlement', description: e.message, variant: 'destructive' });
    }
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
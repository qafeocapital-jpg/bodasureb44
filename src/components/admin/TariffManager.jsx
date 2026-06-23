import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Plus, Power, Save, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import MarkupInput from '@/components/admin/TariffMarkupInput';

const TYPE_LABELS = {
  collection: 'Collection (Lipisha Fare)',
  p2p: 'P2P (SasaPay → SasaPay)',
  transfer_mobile: 'Transfer to Mobile (Withdraw)',
  transfer_bank: 'Transfer to Bank',
  b2c: 'Business → Customer (Settlements)',
};

const TYPE_ORDER = ['collection', 'p2p', 'transfer_mobile', 'transfer_bank', 'b2c'];

export default function TariffManager() {
  const { toast } = useToast();
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTier, setNewTier] = useState({
    transaction_type: 'collection', min_amount_kes: 0, max_amount_kes: 0,
    sasapay_base_fee_kes: 0, is_percentage: false, fee_payer: 'merchant',
    bodasure_markup_kes: 0, bodasure_markup_pct: 0, bodasure_markup_type: 'flat',
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await base44.entities.SasapayFeeTier.filter({}, 'transaction_type', 200);
      setTiers(data);
    } catch (e) {
      toast({ title: 'Failed to load tiers', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  }

  async function handleUpdate(id, updates) {
    setSavingId(id);
    try {
      await base44.entities.SasapayFeeTier.update(id, updates);
      setTiers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      toast({ title: 'Tier updated' });
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
    setSavingId(null);
  }

  async function handleCreate() {
    setSavingId('new');
    try {
      await base44.entities.SasapayFeeTier.create({ ...newTier, is_active: true });
      toast({ title: 'Tier created' });
      setShowAdd(false);
      setNewTier({
        transaction_type: 'collection', min_amount_kes: 0, max_amount_kes: 0,
        sasapay_base_fee_kes: 0, is_percentage: false, fee_payer: 'merchant',
        bodasure_markup_kes: 0, bodasure_markup_pct: 0, bodasure_markup_type: 'flat',
      });
      load();
    } catch (e) {
      toast({ title: 'Create failed', description: e.message, variant: 'destructive' });
    }
    setSavingId(null);
  }

  const grouped = {};
  for (const t of tiers) {
    if (!grouped[t.transaction_type]) grouped[t.transaction_type] = [];
    grouped[t.transaction_type].push(t);
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-muted-foreground animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">SasaPay base fees are pre-seeded. Edit BodaSure markup per tier to earn on every transaction.</p>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 bg-orange-500 text-white rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap">
          <Plus className="w-4 h-4" /> Add Tier
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-orange-300 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold text-sm">New Fee Tier</h3>
            <button onClick={() => setShowAdd(false)} className="p-1 rounded hover:bg-accent"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Type</label>
              <select value={newTier.transaction_type} onChange={e => setNewTier(f => ({ ...f, transaction_type: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-input bg-background text-xs">
                {TYPE_ORDER.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Min KES</label>
              <input type="number" value={newTier.min_amount_kes} onChange={e => setNewTier(f => ({ ...f, min_amount_kes: parseFloat(e.target.value) || 0 }))} className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Max KES</label>
              <input type="number" value={newTier.max_amount_kes} onChange={e => setNewTier(f => ({ ...f, max_amount_kes: parseFloat(e.target.value) || 0 }))} className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">SasaPay Fee</label>
              <input type="number" step="0.5" value={newTier.sasapay_base_fee_kes} onChange={e => setNewTier(f => ({ ...f, sasapay_base_fee_kes: parseFloat(e.target.value) || 0 }))} className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Is %</label>
              <input type="checkbox" checked={newTier.is_percentage} onChange={e => setNewTier(f => ({ ...f, is_percentage: e.target.checked }))} className="w-full mt-1 px-2 py-1.5" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Fee Payer</label>
              <select value={newTier.fee_payer} onChange={e => setNewTier(f => ({ ...f, fee_payer: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-input bg-background text-xs">
                <option value="merchant">Merchant</option>
                <option value="sender">Sender</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Markup Type</label>
              <select value={newTier.bodasure_markup_type} onChange={e => setNewTier(f => ({ ...f, bodasure_markup_type: e.target.value }))} className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-input bg-background text-xs">
                <option value="flat">Flat KES</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Markup Value</label>
              <input type="number" step="0.5" value={newTier.bodasure_markup_type === 'percentage' ? newTier.bodasure_markup_pct : newTier.bodasure_markup_kes} onChange={e => setNewTier(f => ({ ...f, [f.bodasure_markup_type === 'percentage' ? 'bodasure_markup_pct' : 'bodasure_markup_kes']: parseFloat(e.target.value) || 0 }))} className="w-full mt-0.5 px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={savingId === 'new'} className="mt-3 flex items-center gap-1 bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {savingId === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Create Tier
          </button>
        </div>
      )}

      {TYPE_ORDER.map(type => (
        <div key={type} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-muted px-4 py-2.5 flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm">{TYPE_LABELS[type]}</h3>
            <span className="text-xs text-muted-foreground">{(grouped[type] || []).length} tiers</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Band (KES)</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">SasaPay Fee</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Payer</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Markup Type</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Markup Value</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {(grouped[type] || []).sort((a, b) => a.min_amount_kes - b.min_amount_kes).map(tier => (
                  <tr key={tier.id} className={`border-b border-border/50 ${tier.is_active ? '' : 'opacity-40'}`}>
                    <td className="px-3 py-2 font-mono">{tier.min_amount_kes.toLocaleString()} – {tier.max_amount_kes.toLocaleString()}</td>
                    <td className="px-3 py-2">
                      {tier.is_percentage ? `${tier.sasapay_base_fee_kes}%` : `KES ${tier.sasapay_base_fee_kes}`}
                      {type === 'collection' && tier.is_percentage && <span className="text-[10px] text-muted-foreground block">cap KES 150</span>}
                    </td>
                    <td className="px-3 py-2 capitalize">{tier.fee_payer}</td>
                    <td className="px-3 py-2">
                      <select
                        value={tier.bodasure_markup_type}
                        onChange={e => handleUpdate(tier.id, { bodasure_markup_type: e.target.value })}
                        className="px-2 py-1 rounded border border-input bg-background text-xs"
                      >
                        <option value="flat">Flat</option>
                        <option value="percentage">%</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <MarkupInput
                        tier={tier}
                        onSave={updates => handleUpdate(tier.id, updates)}
                        saving={savingId === tier.id}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleUpdate(tier.id, { is_active: !tier.is_active })}
                        disabled={savingId === tier.id}
                        className={`p-1.5 rounded-lg hover:bg-accent ${tier.is_active ? 'text-success' : 'text-muted-foreground'}`}
                      >
                        {savingId === tier.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
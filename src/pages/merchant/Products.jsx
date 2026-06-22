import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { auditLog } from '@/lib/audit';
import { useToast } from '@/components/ui/use-toast';
import { formatKES } from '@/lib/format';
import { FileText, Plus, Pencil } from 'lucide-react';

export default function MerchantProducts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', premium: '', coverage_type: '', duration_days: '365' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      if (u?.scope_entity_id) {
        const p = await base44.entities.InsuranceProduct.filter({ merchant_id: u.scope_entity_id });
        setProducts(p);
      } else {
        const p = await base44.entities.InsuranceProduct.filter({});
        setProducts(p);
      }
    } catch (e) {}
    setLoading(false);
  }

  async function addProduct() {
    const u = await base44.auth.me();
    const cents = Math.round(parseFloat(newProduct.premium) * 100);
    if (!newProduct.name || !cents) return;
    try {
      await base44.entities.InsuranceProduct.create({
        merchant_id: u.scope_entity_id || 'general',
        name: newProduct.name,
        description: newProduct.description,
        premium_cents: cents,
        coverage_type: newProduct.coverage_type,
        duration_days: parseInt(newProduct.duration_days) || 365,
        commission_percentage: 10,
        is_active: true,
      });
      await auditLog({ userId: u.id, action: 'product_created', entityType: 'InsuranceProduct', description: `Created product: ${newProduct.name} (${formatKES(cents)})` });
      toast({ title: 'Product created', description: newProduct.name });
      setShowAdd(false);
      setNewProduct({ name: '', description: '', premium: '', coverage_type: '', duration_days: '365' });
      load();
    } catch (e) {
      toast({ title: 'Failed to create product', description: e.message, variant: 'destructive' });
    }
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-heading font-bold">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage insurance plans</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-semibold">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : products.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No products created yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><FileText className="w-5 h-5 text-emerald-600" /></div>
                <button className="text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
              </div>
              <p className="font-heading font-bold text-sm">{p.name}</p>
              <p className="text-xs text-muted-foreground mb-2">{p.description || p.coverage_type || 'Insurance plan'}</p>
              <p className="text-lg font-bold text-emerald-600">{formatKES(p.premium_cents)}</p>
              <p className="text-xs text-muted-foreground">{p.duration_days} days coverage</p>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-heading font-bold text-lg mb-4">Add Insurance Product</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">Product Name</label><input type="text" value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="Comprehensive Cover" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Description</label><input type="text" value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Premium (KES)</label><input type="number" value={newProduct.premium} onChange={e => setNewProduct(p => ({ ...p, premium: e.target.value }))} placeholder="500" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Coverage Type</label><input type="text" value={newProduct.coverage_type} onChange={e => setNewProduct(p => ({ ...p, coverage_type: e.target.value }))} placeholder="Third Party" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Duration (days)</label><input type="number" value={newProduct.duration_days} onChange={e => setNewProduct(p => ({ ...p, duration_days: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={addProduct} className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
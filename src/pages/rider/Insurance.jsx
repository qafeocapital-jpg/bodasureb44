import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES, formatDate } from '@/lib/format';
import { processWalletPayment, getOrCreateWallet } from '@/lib/payments';
import { verifyPin } from '@/lib/pin';
import { ChevronLeft, ShieldCheck, Loader2, CheckCircle2, XCircle, Plus } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';
import PinEntrySheet from '@/components/rider/PinEntrySheet';

export default function Insurance() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [bikes, setBikes] = useState([]);
  const [products, setProducts] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPurchase, setShowPurchase] = useState(false);
  const [selectedBike, setSelectedBike] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState(null);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const w = await getOrCreateWallet(user.id);
        setWallet(w);
        const owned = await base44.entities.Vehicle.filter({ owner_id: user.id, status: 'approved' });
        const ridden = await base44.entities.Vehicle.filter({ rider_id: user.id, status: 'approved' });
        const merged = [...owned, ...ridden.filter(r => !owned.find(o => o.id === r.id))];
        setBikes(merged);
        const prods = await base44.entities.InsuranceProduct.filter({ is_active: true });
        setProducts(prods);
        const userPolicies = await base44.entities.Policy.filter({ rider_id: user.id, status: 'active' });
        setPolicies(userPolicies);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  function handlePurchase() {
    if (!selectedBike || !selectedProduct) return;
    setShowPin(true);
  }

  async function handlePinConfirm(pin) {
    if (!verifyPin(pin, wallet.pin_hash)) {
      throw new Error('Incorrect PIN. Try again.');
    }
    setShowPin(false);
    setPaying(true);
    setResult(null);
    try {
      const product = products.find(p => p.id === selectedProduct);
      const res = await processWalletPayment({
        walletId: wallet.id,
        type: 'insurance',
        amountCents: product.premium_cents,
        description: `Insurance: ${product.name}`,
        productType: 'insurance',
        vehicleId: selectedBike,
      });

      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + (product.duration_days || 365));

      await base44.entities.Policy.create({
        vehicle_id: selectedBike,
        rider_id: user?.id,
        product_id: product.id,
        merchant_id: product.merchant_id,
        start_date: now.toISOString(),
        end_date: end.toISOString(),
        premium_cents: product.premium_cents,
        status: 'active',
        transaction_id: res.transaction.id,
      });

      setResult({ success: true, amount: product.premium_cents, name: product.name });
      setShowPurchase(false);
      setSelectedBike('');
      setSelectedProduct('');
      const userPolicies = await base44.entities.Policy.filter({ rider_id: user?.id, status: 'active' });
      setPolicies(userPolicies);
    } catch (e) {
      setResult({ success: false, message: e.message || 'Purchase failed. Try again.' });
    }
    setPaying(false);
  }

  if (loading) return <PageSkeleton variant="hero-rows" />;

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">Insurance</h1>
      </div>

      {result?.success && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-5 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-success">Policy Purchased!</p>
            <p className="text-xs text-muted-foreground">{result.name} — {formatKES(result.amount)}</p>
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-5 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{result.message}</p>
        </div>
      )}

      {/* Active Policies */}
      <h2 className="text-sm font-heading font-bold mb-3">Active Policies</h2>
      {policies.length === 0 ? (
        <div className="bg-accent rounded-2xl p-6 text-center mb-5">
          <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No active insurance policies yet.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-5">
          {policies.map(p => {
            const product = products.find(prod => prod.id === p.product_id);
            const bike = bikes.find(b => b.id === p.vehicle_id);
            return (
              <div key={p.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-sm">{product?.name || 'Insurance Policy'}</p>
                      <p className="text-xs text-muted-foreground">{bike?.plate_number || 'Unknown bike'}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-success bg-success/10 rounded-full px-2.5 py-1">Active</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <span>Valid until</span>
                  <span className="font-semibold text-foreground">{formatDate(p.end_date)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Purchase Button */}
      {bikes.length > 0 && products.length > 0 ? (
        <button
          onClick={() => setShowPurchase(true)}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm"
        >
          <Plus className="w-4 h-4" /> Purchase Insurance
        </button>
      ) : (
        <div className="bg-accent rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">
            {bikes.length === 0 ? 'Register and get a bike approved first.' : 'No insurance products available yet.'}
          </p>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchase && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPurchase(false)} />
          <div className="relative w-full max-w-[512px] bg-card rounded-t-3xl p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto">
            <h3 className="font-heading font-bold text-lg mb-4">Purchase Insurance</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Select Bike</label>
                <select value={selectedBike} onChange={e => setSelectedBike(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Choose a bike</option>
                  {bikes.map(b => <option key={b.id} value={b.id}>{b.plate_number} — {b.make}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Select Plan</label>
                <div className="space-y-2 mt-1">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProduct(p.id)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${selectedProduct === p.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.description || p.coverage_type || 'Insurance coverage'}</p>
                        </div>
                        <p className="text-sm font-bold text-primary">{formatKES(p.premium_cents)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowPurchase(false)} className="flex-1 px-4 py-3 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={handlePurchase} disabled={paying || !selectedBike || !selectedProduct} className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
                  {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Pay from Wallet</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PinEntrySheet
        open={showPin}
        onClose={() => setShowPin(false)}
        onConfirm={handlePinConfirm}
        title="Enter PIN to Purchase"
      />
    </div>
  );
}
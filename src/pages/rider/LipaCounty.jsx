import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { formatKES, formatDateTime, formatDate } from '@/lib/format';
import { mockPayment, getOrCreateWallet } from '@/lib/mockPayments';
import { ChevronLeft, BadgeCheck, Loader2, CheckCircle2, XCircle, Landmark, Receipt, AlertCircle } from 'lucide-react';

export default function LipaCounty() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [bikes, setBikes] = useState([]);
  const [feeSchedules, setFeeSchedules] = useState([]);
  const [permits, setPermits] = useState([]);
  const [selectedBike, setSelectedBike] = useState('');
  const [selectedCycle, setSelectedCycle] = useState('');
  const [payMethod, setPayMethod] = useState('wallet');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const u = await base44.auth.me();
        if (u) {
          setUser(u);
          const w = await getOrCreateWallet(u.id);
          setWallet(w);
          const owned = await base44.entities.Vehicle.filter({ owner_id: u.id, status: 'approved' });
          const ridden = await base44.entities.Vehicle.filter({ rider_id: u.id, status: 'approved' });
          const merged = [...owned, ...ridden.filter(r => !owned.find(o => o.id === r.id))];
          setBikes(merged);

          if (merged.length > 0) {
            const bike = merged[0];
            const schedules = await base44.entities.FeeSchedule.filter({ county_id: bike.county_id, is_active: true });
            setFeeSchedules(schedules);
            const perms = await base44.entities.Permit.filter({ rider_id: u.id }, '-created_date', 10);
            setPermits(perms);
          }
        }
      } catch (e) {}
    }
    load();
  }, []);

  async function handleBikeChange(bikeId) {
    setSelectedBike(bikeId);
    setSelectedCycle('');
    const bike = bikes.find(b => b.id === bikeId);
    if (bike) {
      const schedules = await base44.entities.FeeSchedule.filter({ county_id: bike.county_id, is_active: true });
      setFeeSchedules(schedules);
    }
  }

  const selectedSchedule = feeSchedules.find(s => s.permit_type === selectedCycle);
  const selectedBikeObj = bikes.find(b => b.id === selectedBike);

  // Get fee rule for split
  const [feeRules, setFeeRules] = useState([]);
  useEffect(() => {
    async function loadRules() {
      const rules = await base44.entities.FeeRule.filter({ product_type: 'lipa_county', is_active: true });
      setFeeRules(rules);
    }
    loadRules();
  }, []);

  const feeRule = feeRules[0];
  const countyPct = feeRule?.county_percentage ?? 60;
  const saccoPct = feeRule?.sacco_percentage ?? 20;
  const platformPct = feeRule?.platform_percentage ?? 20;

  const countyAmount = selectedSchedule ? Math.round(selectedSchedule.amount_cents * countyPct / 100) : 0;
  const saccoAmount = selectedSchedule ? Math.round(selectedSchedule.amount_cents * saccoPct / 100) : 0;
  const platformAmount = selectedSchedule ? Math.round(selectedSchedule.amount_cents * platformPct / 100) : 0;

  async function handlePay() {
    if (!selectedBike || !selectedSchedule) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await mockPayment({
        walletId: wallet.id,
        type: 'lipa_county',
        amountCents: selectedSchedule.amount_cents,
        description: `${selectedCycle} permit for ${selectedBikeObj.plate_number}`,
        productType: 'lipa_county',
        vehicleId: selectedBike,
        feeRuleId: feeRule?.id,
        feeRuleVersion: feeRule?.version,
      });

      const now = new Date();
      const durations = { weekly: 7, monthly: 30, quarterly: 90, yearly: 365 };
      const end = new Date(now);
      end.setDate(end.getDate() + (durations[selectedCycle] || 30));

      await base44.entities.Permit.create({
        vehicle_id: selectedBike,
        rider_id: user.id,
        county_id: selectedBikeObj.county_id,
        billing_cycle: selectedCycle,
        start_date: now.toISOString(),
        end_date: end.toISOString(),
        status: 'active',
        amount_paid_cents: selectedSchedule.amount_cents,
        transaction_id: res.transaction.id,
        fee_schedule_id: selectedSchedule.id,
        qr_code_data: `BODASURE-${selectedBike}-${Date.now()}`,
      });

      if (feeRule) {
        await base44.entities.TransactionLeg.bulkCreate([
          { transaction_id: res.transaction.id, leg_type: 'county', amount_cents: countyAmount, percentage: countyPct, description: 'County revenue' },
          { transaction_id: res.transaction.id, leg_type: 'sacco', amount_cents: saccoAmount, percentage: saccoPct, description: 'SACCO dividend pool' },
          { transaction_id: res.transaction.id, leg_type: 'platform', amount_cents: platformAmount, percentage: platformPct, description: 'BodaSure platform' },
        ]);
      }

      setResult({ success: true, amount: selectedSchedule.amount_cents, reference: res.reference, cycle: selectedCycle });
      const perms = await base44.entities.Permit.filter({ rider_id: user.id }, '-created_date', 10);
      setPermits(perms);
      setSelectedBike('');
      setSelectedCycle('');
    } catch (e) {
      setResult({ success: false, message: 'Payment failed. Please try again.' });
    }
    setLoading(false);
  }

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">Pay License</h1>
      </div>

      {/* No bikes */}
      {bikes.length === 0 && (
        <div className="bg-accent rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">You need a registered and approved bike to pay for a license.</p>
          <button onClick={() => navigate('/app/bikes/register')} className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold">
            Register Bike
          </button>
        </div>
      )}

      {bikes.length > 0 && (
        <>
          {result?.success && (
            <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-5 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-success">License Paid!</p>
                <p className="text-xs text-muted-foreground">{formatKES(result.amount)} · {result.cycle} permit · Ref: {result.reference}</p>
                <p className="text-[10px] text-success mt-0.5">Your compliance is now active</p>
              </div>
            </div>
          )}

          {result && !result.success && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-5 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{result.message}</p>
            </div>
          )}

          {/* Pay Form */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Select Bike</label>
              <select value={selectedBike} onChange={e => handleBikeChange(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Choose a bike</option>
                {bikes.map(b => <option key={b.id} value={b.id}>{b.plate_number} — {b.make}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Billing Cycle</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {['weekly', 'monthly', 'quarterly', 'yearly'].map(cycle => {
                  const schedule = feeSchedules.find(s => s.permit_type === cycle);
                  return (
                    <button
                      key={cycle}
                      onClick={() => setSelectedCycle(cycle)}
                      disabled={!schedule}
                      className={`p-3 rounded-xl border-2 text-left transition-colors disabled:opacity-40 ${selectedCycle === cycle ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      <p className="text-sm font-semibold capitalize">{cycle}</p>
                      <p className="text-xs text-muted-foreground">{schedule ? formatKES(schedule.amount_cents) : 'Not set'}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fee breakdown */}
            {selectedSchedule && (
              <div className="bg-accent rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-foreground mb-2">Fee Breakdown</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">County Revenue ({countyPct}%)</span>
                  <span className="font-semibold">{formatKES(countyAmount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">SACCO Pool ({saccoPct}%)</span>
                  <span className="font-semibold">{formatKES(saccoAmount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Platform Fee ({platformPct}%)</span>
                  <span className="font-semibold">{formatKES(platformAmount)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-sm font-bold text-primary">{formatKES(selectedSchedule.amount_cents)}</span>
                </div>
              </div>
            )}

            {/* Payment method */}
            {selectedSchedule && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Pay From</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button onClick={() => setPayMethod('wallet')} className={`p-3 rounded-xl border-2 text-center transition-colors ${payMethod === 'wallet' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <p className="text-sm font-semibold">Wallet</p>
                  </button>
                  <button onClick={() => setPayMethod('mpesa')} className={`p-3 rounded-xl border-2 text-center transition-colors ${payMethod === 'mpesa' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <p className="text-sm font-semibold">M-Pesa</p>
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={loading || !selectedBike || !selectedSchedule}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <><BadgeCheck className="w-5 h-5" /> Pay {selectedSchedule ? formatKES(selectedSchedule.amount_cents) : ''}</>}
            </button>
          </div>

          {/* Payment History */}
          <div className="mt-6">
            <h2 className="text-sm font-heading font-bold mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Permit History
            </h2>
            {permits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No permits purchased yet</p>
            ) : (
              <div className="space-y-2">
                {permits.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium capitalize">{p.billing_cycle} Permit</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.start_date)} → {formatDate(p.end_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatKES(p.amount_paid_cents)}</p>
                      <span className={`text-[10px] font-medium ${p.status === 'active' ? 'text-success' : 'text-muted-foreground'}`}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ChevronLeft, ChevronRight, Loader2, Building2, Banknote, FileText, Plus, Trash2, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const KENYAN_BANKS = [
  'Kenya Commercial Bank (KCB)', 'Equity Bank', 'Cooperative Bank', 'Standard Chartered',
  'Absa Bank Kenya', 'NCBA Bank', 'I&M Bank', 'Stanbic Bank', 'Diamond Trust Bank',
  'Sidian Bank', 'Family Bank', 'Guardian Bank', 'Gulf African Bank', 'National Bank of Kenya',
];

const GROUP_TYPES = [
  { value: 'sacco', label: 'SACCO' },
  { value: 'chama', label: 'Chama' },
  { value: 'welfare', label: 'Welfare' },
  { value: 'self_help', label: 'Self Help' },
  { value: 'independent', label: 'Independent' },
  { value: 'other', label: 'Other' },
];

const OFFICIAL_ROLES = [
  { value: 'chairperson', label: 'Chairperson' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'treasurer', label: 'Treasurer' },
];

const PURPOSES = ['Collection', 'Disbursement', 'Remittance'];
const DOC_TYPES = [
  { value: 'ID_NUMBER', label: 'National ID' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'ALIEN_ID', label: 'Alien ID' },
];

export default function SaccoRegister() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [counties, setCounties] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', type: 'sacco', county_id: '', constituency_id: '', official_role: 'chairperson',
    kra_pin: '', registration_number: '', bank_name: '', bank_account_name: '', bank_account_number: '', bank_branch: '',
    mpesa_till_number: '',
    nature_of_business: '', physical_address: '',
    estimated_monthly_transaction_amount: '', estimated_monthly_transaction_count: '',
    purpose: 'Collection',
    directors: [{ director_name: '', director_id_number: '', director_mobile_number: '', director_kra_pin: '', director_document_type: 'ID_NUMBER', director_country_code: '+254' }],
  });

  useEffect(() => {
    base44.entities.County.filter({}).then(setCounties).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.county_id) {
      base44.entities.Constituency.filter({ county_id: form.county_id }).then(setConstituencies).catch(() => setConstituencies([]));
    } else {
      setConstituencies([]);
    }
  }, [form.county_id]);

  // Sync constituency name to constituency_hint when selected
  useEffect(() => {
    if (form.constituency_id) {
      const c = constituencies.find(c => c.id === form.constituency_id);
      if (c) update('constituency_hint', c.name);
    }
  }, [form.constituency_id]);

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function updateDirector(idx, field, value) {
    setForm(f => {
      const directors = [...f.directors];
      directors[idx] = { ...directors[idx], [field]: value };
      return { ...f, directors };
    });
  }

  function addDirector() {
    setForm(f => ({ ...f, directors: [...f.directors, { director_name: '', director_id_number: '', director_mobile_number: '', director_kra_pin: '', director_document_type: 'ID_NUMBER', director_country_code: '+254' }] }));
  }

  function removeDirector(idx) {
    setForm(f => ({ ...f, directors: f.directors.filter((_, i) => i !== idx) }));
  }

  function validateStep(s) {
    if (s === 1) return form.name && form.type && form.county_id && form.official_role;
    if (s === 2) return form.kra_pin && form.registration_number && (form.bank_account_number || form.mpesa_till_number);
    if (s === 3) return form.nature_of_business && form.physical_address && form.purpose && form.directors.length > 0 && form.directors[0].director_name && form.directors[0].director_id_number;
    return false;
  }

  async function handleSubmit() {
    if (!user) return;
    setSaving(true);
    try {
      // Create the group with pending status
      const group = await base44.entities.Group.create({
        name: form.name,
        type: form.type,
        county_id: form.county_id,
        status: 'pending',
        source: 'self_registered',
        kyc_status: 'unverified',
        description: '',
        kra_pin: form.kra_pin,
        registration_number: form.registration_number,
        bank_name: form.bank_name,
        bank_account_name: form.bank_account_name,
        bank_account_number: form.bank_account_number,
        bank_branch: form.bank_branch,
        mpesa_till_number: form.mpesa_till_number,
        nature_of_business: form.nature_of_business,
        physical_address: form.physical_address,
        estimated_monthly_transaction_amount: parseFloat(form.estimated_monthly_transaction_amount) || 0,
        estimated_monthly_transaction_count: parseFloat(form.estimated_monthly_transaction_count) || 0,
        purpose: form.purpose,
        directors: form.directors,
        official_name: user.full_name || '',
        official_phone: user.phone || '',
        official_email: user.email || '',
      });

      // Update user with pending group reference and role context
      await base44.auth.updateMe({
        pending_group_id: group.id,
        pending_group_role: form.official_role,
      });

      toast({ title: 'Application Submitted', description: 'Your SACCO registration is pending Super Admin review.' });
      navigate('/app/groups');
    } catch (e) {
      toast({ title: 'Submission Failed', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  const stepIcons = [Building2, Banknote, FileText];

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border px-5 py-3 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-heading font-bold">Register SACCO / Group</h1>
          <p className="text-[10px] text-muted-foreground">Step {step} of 3</p>
        </div>
      </div>

      {/* Step Progress */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s, i) => {
            const Icon = stepIcons[i];
            const isActive = step === s;
            const isDone = step > s;
            return (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isDone ? 'bg-success text-white' : isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                  {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 mx-1 ${step > s ? 'bg-success' : 'bg-border'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="px-5 pb-32">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-sm font-heading font-bold flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Basic Identity</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Group Name *</label>
              <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Kisumu Bodaboda SACCO" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Group Type *</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {GROUP_TYPES.map(t => (
                  <button key={t.value} onClick={() => update('type', t.value)} className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${form.type === t.value ? 'bg-primary text-white border-primary' : 'bg-card border-border text-muted-foreground'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">County *</label>
              <select value={form.county_id} onChange={e => update('county_id', e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                <option value="">Select county</option>
                {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Constituency</label>
              <select value={form.constituency_id} onChange={e => update('constituency_id', e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                <option value="">Select constituency</option>
                {constituencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Your Role in the Group *</label>
              <select value={form.official_role} onChange={e => update('official_role', e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                {OFFICIAL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-sm font-heading font-bold flex items-center gap-2"><Banknote className="w-4 h-4 text-primary" /> Financial Identity</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">KRA PIN *</label>
                <input value={form.kra_pin} onChange={e => update('kra_pin', e.target.value)} placeholder="A123456789X" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Registration Cert. No. *</label>
                <input value={form.registration_number} onChange={e => update('registration_number', e.target.value)} placeholder="CERT/2024/001" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold mb-2">Bank Details</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Bank Name</label>
                  <select value={form.bank_name} onChange={e => update('bank_name', e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                    <option value="">Select bank</option>
                    {KENYAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Account Name</label>
                    <input value={form.bank_account_name} onChange={e => update('bank_account_name', e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Account Number</label>
                    <input value={form.bank_account_number} onChange={e => update('bank_account_number', e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Branch</label>
                  <input value={form.bank_branch} onChange={e => update('bank_branch', e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <label className="text-xs font-medium text-muted-foreground">M-Pesa Till Number</label>
              <input value={form.mpesa_till_number} onChange={e => update('mpesa_till_number', e.target.value)} placeholder="1234567" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">Provide either bank account or M-Pesa till number</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-sm font-heading font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Business KYC</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nature of Business *</label>
              <input value={form.nature_of_business} onChange={e => update('nature_of_business', e.target.value)} placeholder="Bodaboda transport services" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Physical Address *</label>
              <textarea value={form.physical_address} onChange={e => update('physical_address', e.target.value)} rows={2} placeholder="Plot 12, Oginga Odinga Street, Kisumu" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Est. Monthly Amount (KES)</label>
                <input type="number" value={form.estimated_monthly_transaction_amount} onChange={e => update('estimated_monthly_transaction_amount', e.target.value)} placeholder="500000" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Est. Monthly Count</label>
                <input type="number" value={form.estimated_monthly_transaction_count} onChange={e => update('estimated_monthly_transaction_count', e.target.value)} placeholder="2000" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Purpose *</label>
              <select value={form.purpose} onChange={e => update('purpose', e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold">Directors</p>
                <button onClick={addDirector} className="flex items-center gap-1 text-xs text-primary font-medium">
                  <Plus className="w-3.5 h-3.5" /> Add Director
                </button>
              </div>
              <div className="space-y-3">
                {form.directors.map((d, idx) => (
                  <div key={idx} className="bg-muted/50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-muted-foreground">Director {idx + 1}</p>
                      {form.directors.length > 1 && (
                        <button onClick={() => removeDirector(idx)} className="p-1 rounded-lg hover:bg-destructive/10">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      )}
                    </div>
                    <input value={d.director_name} onChange={e => updateDirector(idx, 'director_name', e.target.value)} placeholder="Full name" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={d.director_id_number} onChange={e => updateDirector(idx, 'director_id_number', e.target.value)} placeholder="ID Number" className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                      <input value={d.director_mobile_number} onChange={e => updateDirector(idx, 'director_mobile_number', e.target.value)} placeholder="Mobile (254...)" className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={d.director_kra_pin} onChange={e => updateDirector(idx, 'director_kra_pin', e.target.value)} placeholder="KRA PIN" className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                      <select value={d.director_document_type} onChange={e => updateDirector(idx, 'director_document_type', e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                        {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border px-5 py-3 flex gap-2 max-w-[512px] mx-auto">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="flex-1 border border-border rounded-xl py-3 text-sm font-semibold">Back</button>
        )}
        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!validateStep(step)}
            className="flex-1 flex items-center justify-center gap-1 bg-primary text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!validateStep(3) || saving}
            className="flex-1 flex items-center justify-center gap-1 bg-success text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Submit Application</>}
          </button>
        )}
      </div>
    </div>
  );
}
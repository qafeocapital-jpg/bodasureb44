import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Banknote, Plus, Trash2, Loader2, Check, Building2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const KENYAN_BANKS = [
  'Kenya Commercial Bank (KCB)', 'Equity Bank', 'Cooperative Bank', 'Standard Chartered',
  'Absa Bank Kenya', 'NCBA Bank', 'I&M Bank', 'Stanbic Bank', 'Diamond Trust Bank',
  'Sidian Bank', 'Family Bank', 'Guardian Bank', 'Gulf African Bank', 'National Bank of Kenya',
];

const PURPOSES = ['Collection', 'Disbursement', 'Remittance'];
const DOC_TYPES = [
  { value: 'ID_NUMBER', label: 'National ID' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'ALIEN_ID', label: 'Alien ID' },
];

export default function GroupKybBusiness({ group, onSubmitted }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bank_name: '', bank_account_name: '', bank_account_number: '', bank_branch: '',
    mpesa_till_number: '',
    nature_of_business: '', physical_address: '',
    estimated_monthly_transaction_amount: '', estimated_monthly_transaction_count: '',
    purpose: 'Collection',
    kra_pin: '', registration_number: '',
    directors: [{ director_name: '', director_id_number: '', director_mobile_number: '', director_kra_pin: '', director_document_type: 'ID_NUMBER', director_country_code: '+254' }],
  });

  useEffect(() => {
    if (group) {
      setForm(f => ({
        ...f,
        bank_name: group.bank_name || '',
        bank_account_name: group.bank_account_name || '',
        bank_account_number: group.bank_account_number || '',
        bank_branch: group.bank_branch || '',
        mpesa_till_number: group.mpesa_till_number || '',
        nature_of_business: group.nature_of_business || '',
        physical_address: group.physical_address || '',
        estimated_monthly_transaction_amount: group.estimated_monthly_transaction_amount || '',
        estimated_monthly_transaction_count: group.estimated_monthly_transaction_count || '',
        purpose: group.purpose || 'Collection',
        kra_pin: group.kra_pin || '',
        registration_number: group.registration_number || '',
        directors: group.directors?.length > 0 ? group.directors : f.directors,
      }));
    }
  }, [group]);

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

  function validate() {
    return form.nature_of_business && form.physical_address && form.purpose &&
      form.kra_pin && form.registration_number &&
      (form.bank_account_number || form.mpesa_till_number) &&
      form.directors.length > 0 && form.directors[0].director_name && form.directors[0].director_id_number;
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await base44.entities.Group.update(group.id, {
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
        kra_pin: form.kra_pin,
        registration_number: form.registration_number,
        directors: form.directors,
      });

      // Transition to KYB_PENDING
      await base44.functions.invoke('transitionGroupState', {
        groupId: group.id,
        event: 'kyb_submitted',
        metadata: { description: 'KYB business account details submitted for review' },
      });

      toast({ title: 'KYB Submitted', description: 'Your group is now pending review. We\'ll notify you when your business wallet is ready.' });
      onSubmitted();
    } catch (e) {
      toast({ title: 'Failed to submit', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">KRA PIN *</label>
          <input value={form.kra_pin} onChange={e => update('kra_pin', e.target.value)} placeholder="A123456789X" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Registration No. *</label>
          <input value={form.registration_number} onChange={e => update('registration_number', e.target.value)} placeholder="CERT/2024/001" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <div className="flex items-center gap-2 mb-2"><Banknote className="w-4 h-4 text-primary" /><p className="text-xs font-semibold">Bank Details</p></div>
        <div className="space-y-2">
          <select value={form.bank_name} onChange={e => update('bank_name', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
            <option value="">Select bank</option>
            {KENYAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.bank_account_name} onChange={e => update('bank_account_name', e.target.value)} placeholder="Account name" className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
            <input value={form.bank_account_number} onChange={e => update('bank_account_number', e.target.value)} placeholder="Account number" className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
          </div>
          <input value={form.bank_branch} onChange={e => update('bank_branch', e.target.value)} placeholder="Branch" className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <label className="text-xs font-medium text-muted-foreground">M-Pesa Till Number</label>
        <input value={form.mpesa_till_number} onChange={e => update('mpesa_till_number', e.target.value)} placeholder="1234567" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
        <p className="text-[10px] text-muted-foreground mt-1">Provide bank account or M-Pesa till</p>
      </div>

      <div className="pt-2 border-t border-border">
        <div className="flex items-center gap-2 mb-2"><Building2 className="w-4 h-4 text-primary" /><p className="text-xs font-semibold">Business Details</p></div>
        <div className="space-y-2">
          <input value={form.nature_of_business} onChange={e => update('nature_of_business', e.target.value)} placeholder="Nature of business *" className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
          <textarea value={form.physical_address} onChange={e => update('physical_address', e.target.value)} rows={2} placeholder="Physical address *" className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={form.estimated_monthly_transaction_amount} onChange={e => update('estimated_monthly_transaction_amount', e.target.value)} placeholder="Est. monthly amount (KES)" className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
            <input type="number" value={form.estimated_monthly_transaction_count} onChange={e => update('estimated_monthly_transaction_count', e.target.value)} placeholder="Est. monthly count" className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
          </div>
          <select value={form.purpose} onChange={e => update('purpose', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
            {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold">Directors</p>
          <button onClick={addDirector} className="flex items-center gap-1 text-xs text-primary font-medium">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {form.directors.map((d, idx) => (
            <div key={idx} className="bg-muted/50 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground">Director {idx + 1}</p>
                {form.directors.length > 1 && (
                  <button onClick={() => removeDirector(idx)} className="p-1 rounded-lg hover:bg-destructive/10">
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                )}
              </div>
              <input value={d.director_name} onChange={e => updateDirector(idx, 'director_name', e.target.value)} placeholder="Full name" className="w-full px-2.5 py-2 rounded-lg border border-input bg-background text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input value={d.director_id_number} onChange={e => updateDirector(idx, 'director_id_number', e.target.value)} placeholder="ID number" className="px-2.5 py-2 rounded-lg border border-input bg-background text-sm" />
                <input value={d.director_mobile_number} onChange={e => updateDirector(idx, 'director_mobile_number', e.target.value)} placeholder="Mobile (254...)" className="px-2.5 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={d.director_kra_pin} onChange={e => updateDirector(idx, 'director_kra_pin', e.target.value)} placeholder="KRA PIN" className="px-2.5 py-2 rounded-lg border border-input bg-background text-sm" />
                <select value={d.director_document_type} onChange={e => updateDirector(idx, 'director_document_type', e.target.value)} className="px-2.5 py-2 rounded-lg border border-input bg-background text-sm">
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!validate() || saving}
        className="w-full flex items-center justify-center gap-1 bg-primary text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Submit for KYB Review</>}
      </button>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ChevronLeft, ChevronRight, Check, MapPin } from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [counties, setCounties] = useState([]);
  const [subCounties, setSubCounties] = useState([]);
  const [wards, setWards] = useState([]);
  const [stages, setStages] = useState([]);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    national_id: '',
    county_id: '',
    sub_county_id: '',
    ward_id: '',
    stage_id: '',
  });

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        setForm({
          full_name: user.full_name || '',
          phone: user.phone || '',
          national_id: user.national_id || '',
          county_id: user.county_id || '',
          sub_county_id: user.sub_county_id || '',
          ward_id: user.ward_id || '',
          stage_id: user.stage_id || '',
        });
        if (user.county_id) {
          const subs = await base44.entities.SubCounty.filter({ county_id: user.county_id });
          setSubCounties(subs);
          if (user.sub_county_id) {
            const ws = await base44.entities.Ward.filter({ sub_county_id: user.sub_county_id });
            setWards(ws);
            if (user.ward_id) {
              const sts = await base44.entities.Stage.filter({ ward_id: user.ward_id });
              setStages(sts);
            }
          }
        }
        const cs = await base44.entities.County.filter({});
        setCounties(cs);
      } catch (e) {}
    }
    load();
  }, [user]);

  async function handleCountyChange(countyId) {
    setForm(f => ({ ...f, county_id: countyId, sub_county_id: '', ward_id: '', stage_id: '' }));
    setSubCounties([]);
    setWards([]);
    setStages([]);
    if (countyId) {
      const subs = await base44.entities.SubCounty.filter({ county_id: countyId });
      setSubCounties(subs);
    }
  }

  async function handleSubCountyChange(subCountyId) {
    setForm(f => ({ ...f, sub_county_id: subCountyId, ward_id: '', stage_id: '' }));
    setWards([]);
    setStages([]);
    if (subCountyId) {
      const ws = await base44.entities.Ward.filter({ sub_county_id: subCountyId });
      setWards(ws);
    }
  }

  async function handleWardChange(wardId) {
    setForm(f => ({ ...f, ward_id: wardId, stage_id: '' }));
    setStages([]);
    if (wardId) {
      const sts = await base44.entities.Stage.filter({ ward_id: wardId });
      setStages(sts);
    }
  }

  const steps = [
    {
      title: 'Personal Details',
      fields: ['full_name', 'phone', 'national_id'],
    },
    {
      title: 'County',
      fields: ['county_id'],
    },
    {
      title: 'Sub-County',
      fields: ['sub_county_id'],
    },
    {
      title: 'Ward',
      fields: ['ward_id'],
    },
    {
      title: 'Stage',
      fields: ['stage_id'],
    },
  ];

  const canProceed = () => {
    const current = steps[step];
    return current.fields.every(f => form[f] && form[f].trim() !== '');
  };

  async function handleSave() {
    setSaving(true);
    try {
      const isComplete = form.full_name && form.county_id && form.sub_county_id && form.ward_id;
      await base44.auth.updateMe({
        full_name: form.full_name,
        phone: form.phone,
        national_id: form.national_id,
        county_id: form.county_id,
        sub_county_id: form.sub_county_id,
        ward_id: form.ward_id,
        stage_id: form.stage_id,
        profile_complete: isComplete,
      });
      navigate('/app');
    } catch (e) {}
    setSaving(false);
  }

  const renderField = (field) => {
    switch (field) {
      case 'full_name':
        return (
          <div key={field}>
            <label className="text-xs font-medium text-muted-foreground">Full Name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="John Mwangi"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        );
      case 'phone':
        return (
          <div key={field}>
            <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="07XX XXX XXX"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        );
      case 'national_id':
        return (
          <div key={field}>
            <label className="text-xs font-medium text-muted-foreground">National ID (Optional)</label>
            <input
              type="text"
              value={form.national_id}
              onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))}
              placeholder="00000000"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        );
      case 'county_id':
        return (
          <div key={field}>
            <label className="text-xs font-medium text-muted-foreground">County</label>
            <select
              value={form.county_id}
              onChange={e => handleCountyChange(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select county</option>
              {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        );
      case 'sub_county_id':
        return (
          <div key={field}>
            <label className="text-xs font-medium text-muted-foreground">Sub-County</label>
            <select
              value={form.sub_county_id}
              onChange={e => handleSubCountyChange(e.target.value)}
              disabled={!form.county_id}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="">Select sub-county</option>
              {subCounties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        );
      case 'ward_id':
        return (
          <div key={field}>
            <label className="text-xs font-medium text-muted-foreground">Ward</label>
            <select
              value={form.ward_id}
              onChange={e => handleWardChange(e.target.value)}
              disabled={!form.sub_county_id}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="">Select ward</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        );
      case 'stage_id':
        return (
          <div key={field}>
            <label className="text-xs font-medium text-muted-foreground">Stage (Optional)</label>
            <select
              value={form.stage_id}
              onChange={e => setForm(f => ({ ...f, stage_id: e.target.value }))}
              disabled={!form.ward_id}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="">Select stage</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {form.ward_id && (
              <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Your stage is where you pick up passengers.
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">Edit Profile</h1>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1.5 mb-6">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-1">Step {step + 1} of {steps.length}</p>
      <h2 className="font-heading font-bold text-lg mb-5">{steps[step].title}</h2>

      <div className="space-y-4">
        {steps[step].fields.map(field => renderField(field))}
      </div>

      <div className="flex gap-2 mt-8">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1 px-5 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving || !form.full_name || !form.county_id}
            className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : <><Check className="w-4 h-4" /> Save Profile</>}
          </button>
        )}
      </div>
    </div>
  );
}
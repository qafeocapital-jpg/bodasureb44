import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ChevronLeft, ChevronRight, Check, Bike as BikeIcon, MapPin, Camera, FileText } from 'lucide-react';

export default function BikeRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [counties, setCounties] = useState([]);
  const [subCounties, setSubCounties] = useState([]);
  const [wards, setWards] = useState([]);
  const [stages, setStages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [bikePhotoUrl, setBikePhotoUrl] = useState('');
  const [riderPhotoUrl, setRiderPhotoUrl] = useState('');
  const [logbookUrl, setLogbookUrl] = useState('');
  const [ownerIdUrl, setOwnerIdUrl] = useState('');
  const [uploadingField, setUploadingField] = useState(null);
  const fileRefs = {
    bike_photo: useRef(null),
    rider_photo: useRef(null),
    logbook: useRef(null),
    owner_id: useRef(null),
  };

  const [form, setForm] = useState({
    role: 'rider',
    plate_number: '',
    make: '',
    color: '',
    year: '',
    county_id: '',
    sub_county_id: '',
    ward_id: '',
    stage_id: '',
    is_owner_rider: true,
    owner_phone: '',
  });

  useEffect(() => {
    async function load() {
      const cs = await base44.entities.County.filter({});
      setCounties(cs);
    }
    load();
  }, []);

  async function handleFileUpload(field, file) {
    if (!file) return;
    setUploadingField(field);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      switch (field) {
        case 'bike_photo': setBikePhotoUrl(file_url); break;
        case 'rider_photo': setRiderPhotoUrl(file_url); break;
        case 'logbook': setLogbookUrl(file_url); break;
        case 'owner_id': setOwnerIdUrl(file_url); break;
      }
    } catch (e) {}
    setUploadingField(null);
  }

  async function handleCountyChange(countyId) {
    setForm(f => ({ ...f, county_id: countyId, sub_county_id: '', ward_id: '', stage_id: '' }));
    setSubCounties([]); setWards([]); setStages([]);
    if (countyId) {
      const subs = await base44.entities.SubCounty.filter({ county_id: countyId });
      setSubCounties(subs);
    }
  }

  async function handleSubCountyChange(subCountyId) {
    setForm(f => ({ ...f, sub_county_id: subCountyId, ward_id: '', stage_id: '' }));
    setWards([]); setStages([]);
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
    { title: 'Your Role', icon: BikeIcon },
    { title: 'Bike Details', icon: FileText },
    { title: 'Location', icon: MapPin },
    { title: 'Photos', icon: Camera },
    { title: 'Documents', icon: FileText },
  ];

  const canProceed = () => {
    switch (step) {
      case 0: return !!form.role;
      case 1: return form.plate_number && form.make && form.color;
      case 2: return form.county_id && form.sub_county_id && form.ward_id;
      case 3: return bikePhotoUrl && riderPhotoUrl;
      case 4: return logbookUrl && (form.is_owner_rider || ownerIdUrl);
      default: return false;
    }
  };

  async function handleSubmit() {
    setSaving(true);
    try {
      const isOwnerRider = form.role === 'owner_rider' || form.role === 'rider';
      const isOwner = form.role === 'owner' || form.role === 'owner_rider';

      await base44.entities.Vehicle.create({
        plate_number: form.plate_number.toUpperCase(),
        make: form.make,
        color: form.color,
        year: form.year ? parseInt(form.year) : null,
        owner_id: isOwner ? user.id : null,
        rider_id: user.id,
        county_id: form.county_id,
        stage_id: form.stage_id || null,
        status: 'pending',
        bike_photo_url: bikePhotoUrl,
        rider_photo_url: riderPhotoUrl,
        logbook_url: logbookUrl,
        owner_id_doc_url: isOwner ? null : ownerIdUrl,
        is_owner_rider: isOwner,
      });
      setStep(5);
    } catch (e) {}
    setSaving(false);
  }

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">Register Bike</h1>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-6">
        {steps.map((s, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
        ))}
      </div>

      {step < 5 && (
        <>
          <p className="text-xs text-muted-foreground mb-1">Step {step + 1} of {steps.length}</p>
          <h2 className="font-heading font-bold text-lg mb-5">{steps[step].title}</h2>
        </>
      )}

      {/* Step 0: Role */}
      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground mb-3">Are you the bike owner, the rider, or both?</p>
          {[
            { val: 'rider', label: 'I ride this bike', desc: 'Someone else owns it' },
            { val: 'owner', label: 'I own this bike', desc: 'Someone else rides it' },
            { val: 'owner_rider', label: 'I own and ride', desc: 'I am both owner and rider' },
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setForm(f => ({ ...f, role: opt.val, is_owner_rider: opt.val === 'owner_rider' }))}
              className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${form.role === opt.val ? 'border-primary bg-primary/5' : 'border-border'}`}
            >
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
          <button onClick={() => setStep(1)} disabled={!canProceed()} className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 1: Bike Details */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Plate Number</label>
            <input
              type="text"
              value={form.plate_number}
              onChange={e => setForm(f => ({ ...f, plate_number: e.target.value }))}
              placeholder="KMEA 123A"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Make</label>
            <input
              type="text"
              value={form.make}
              onChange={e => setForm(f => ({ ...f, make: e.target.value }))}
              placeholder="Honda, Yamaha, TVS..."
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">Color</label>
              <input
                type="text"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                placeholder="Black"
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="w-28">
              <label className="text-xs font-medium text-muted-foreground">Year</label>
              <input
                type="number"
                value={form.year}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                placeholder="2021"
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(0)} className="px-5 py-3 rounded-xl border border-border text-sm font-semibold">Back</button>
            <button onClick={() => setStep(2)} disabled={!canProceed()} className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Location */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">County</label>
            <select value={form.county_id} onChange={e => handleCountyChange(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Select county</option>
              {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Sub-County</label>
            <select value={form.sub_county_id} onChange={e => handleSubCountyChange(e.target.value)} disabled={!form.county_id} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50">
              <option value="">Select sub-county</option>
              {subCounties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Ward</label>
            <select value={form.ward_id} onChange={e => handleWardChange(e.target.value)} disabled={!form.sub_county_id} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50">
              <option value="">Select ward</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Stage (Optional)</label>
            <select value={form.stage_id} onChange={e => setForm(f => ({ ...f, stage_id: e.target.value }))} disabled={!form.ward_id} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50">
              <option value="">Select stage</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(1)} className="px-5 py-3 rounded-xl border border-border text-sm font-semibold">Back</button>
            <button onClick={() => setStep(3)} disabled={!canProceed()} className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Photos */}
      {step === 3 && (
        <div className="space-y-4">
          {[
            { key: 'bike_photo', label: 'Bike Photo', url: bikePhotoUrl, desc: 'Clear photo of the motorbike' },
            { key: 'rider_photo', label: 'Rider on Bike', url: riderPhotoUrl, desc: 'Photo of you on the bike' },
          ].map(item => (
            <div key={item.key} className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm font-medium mb-1">{item.label}</p>
              <p className="text-xs text-muted-foreground mb-3">{item.desc}</p>
              <input ref={fileRefs[item.key]} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileUpload(item.key, e.target.files[0])} />
              {item.url ? (
                <div className="relative">
                  <img src={item.url} alt={item.label} className="w-full h-40 object-cover rounded-lg" />
                  <button onClick={() => fileRefs[item.key].current?.click()} className="absolute bottom-2 right-2 bg-black/60 text-white rounded-lg px-3 py-1.5 text-xs font-medium">
                    Replace
                  </button>
                  <Check className="absolute top-2 right-2 w-5 h-5 text-success bg-white rounded-full p-0.5" />
                </div>
              ) : (
                <button onClick={() => fileRefs[item.key].current?.click()} disabled={uploadingField === item.key} className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-8 hover:bg-accent transition-colors disabled:opacity-50">
                  {uploadingField === item.key ? 'Uploading...' : <><Camera className="w-6 h-6 text-muted-foreground" /><span className="text-xs text-muted-foreground">Tap to upload</span></>}
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(2)} className="px-5 py-3 rounded-xl border border-border text-sm font-semibold">Back</button>
            <button onClick={() => setStep(4)} disabled={!canProceed()} className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Documents */}
      {step === 4 && (
        <div className="space-y-4">
          {[
            { key: 'logbook', label: 'Logbook', url: logbookUrl, desc: 'Vehicle logbook photo' },
            ...(!form.is_owner_rider ? [{ key: 'owner_id', label: 'Owner ID', url: ownerIdUrl, desc: "Bike owner's national ID" }] : []),
          ].map(item => (
            <div key={item.key} className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm font-medium mb-1">{item.label}</p>
              <p className="text-xs text-muted-foreground mb-3">{item.desc}</p>
              <input ref={fileRefs[item.key]} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(item.key, e.target.files[0])} />
              {item.url ? (
                <div className="relative">
                  <img src={item.url} alt={item.label} className="w-full h-40 object-cover rounded-lg" />
                  <button onClick={() => fileRefs[item.key].current?.click()} className="absolute bottom-2 right-2 bg-black/60 text-white rounded-lg px-3 py-1.5 text-xs font-medium">Replace</button>
                  <Check className="absolute top-2 right-2 w-5 h-5 text-success bg-white rounded-full p-0.5" />
                </div>
              ) : (
                <button onClick={() => fileRefs[item.key].current?.click()} disabled={uploadingField === item.key} className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-8 hover:bg-accent transition-colors disabled:opacity-50">
                  {uploadingField === item.key ? 'Uploading...' : <><Camera className="w-6 h-6 text-muted-foreground" /><span className="text-xs text-muted-foreground">Tap to upload</span></>}
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(3)} className="px-5 py-3 rounded-xl border border-border text-sm font-semibold">Back</button>
            <button onClick={handleSubmit} disabled={!canProceed() || saving} className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
              {saving ? 'Submitting...' : <><Check className="w-4 h-4" /> Submit Registration</>}
            </button>
          </div>
        </div>
      )}

      {/* Success */}
      {step === 5 && (
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-success" />
          </div>
          <h2 className="font-heading font-bold text-xl mb-2">Registration Submitted!</h2>
          <p className="text-sm text-muted-foreground mb-6">Your bike is now pending county approval. You'll be notified once it's approved.</p>
          <button onClick={() => navigate('/app/bikes')} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm">
            View My Bikes
          </button>
        </div>
      )}
    </div>
  );
}
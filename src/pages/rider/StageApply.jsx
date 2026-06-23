import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ChevronLeft, MapPin, Loader2, Send, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function StageApply() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [stages, setStages] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedStage, setSelectedStage] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const countyId = user?.county_id;

  useEffect(() => {
    async function load() {
      if (!user || !countyId) { setLoading(false); return; }
      try {
        const [s, w] = await Promise.all([
          base44.entities.Stage.filter({ county_id: countyId }),
          base44.entities.Ward.filter({ county_id: countyId }).catch(() => []),
        ]);
        setStages(s);
        setWards(w);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user, countyId]);

  async function handleSubmit() {
    if (!selectedStage || !user) return;
    setSubmitting(true);
    try {
      await base44.entities.Stage.update(selectedStage, {
        pending_leader_id: user.id,
        pending_leader_role: 'team_leader',
        pending_leader_note: note,
        application_status: 'pending_sacco',
        application_submitted_at: new Date().toISOString(),
      });
      toast({ title: 'Application Submitted', description: 'Your SACCO chairperson will review your application first.' });
      navigate('/app/account');
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setSubmitting(false);
  }

  const wardName = (wardId) => wards.find(w => w.id === wardId)?.name || '—';

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="sticky top-0 z-30 bg-card border-b border-border px-5 py-3 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-heading font-bold">Apply as Stage Leader</h1>
      </div>

      <div className="p-5 space-y-5">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-blue-900 mb-1">Two-Step Approval Process</p>
          <p className="text-xs text-blue-700">1. SACCO chairperson reviews and approves your application</p>
          <p className="text-xs text-blue-700">2. County admin confirms and assigns you as stage leader</p>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Select Your Stage *</label>
          <div className="space-y-2 mt-2 max-h-64 overflow-y-auto">
            {stages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No stages available in your county yet.</p>
            ) : (
              stages.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStage(s.id)}
                  className={`w-full flex items-center gap-3 rounded-xl p-3 border transition-colors text-left ${selectedStage === s.id ? 'bg-primary/5 border-primary' : 'bg-card border-border hover:bg-accent'}`}
                >
                  <MapPin className={`w-5 h-5 ${selectedStage === s.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{wardName(s.ward_id)}</p>
                  </div>
                  {selectedStage === s.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Motivation Note</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="Why should you be the stage leader? Briefly describe your experience and commitment..."
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedStage || submitting}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Submit Application
        </button>
      </div>
    </div>
  );
}
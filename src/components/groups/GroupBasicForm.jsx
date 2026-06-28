import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, Building2, AlertCircle, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const GROUP_TYPES = [
  { value: 'sacco', label: 'SACCO' },
  { value: 'chama', label: 'Chama' },
  { value: 'welfare', label: 'Welfare' },
  { value: 'self_help', label: 'Self-Help' },
];

const SIZE_BANDS = [
  { value: '<50', label: 'Less than 50' },
  { value: '50-200', label: '50 – 200' },
  { value: '200-500', label: '200 – 500' },
  { value: '500+', label: '500+' },
];

const OFFICIAL_ROLES = [
  { value: 'chairperson', label: 'Chairperson' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'treasurer', label: 'Treasurer' },
];

// Simple Levenshtein distance for fuzzy duplicate detection
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function isNearDuplicate(name, existingName) {
  const a = name.toLowerCase().trim();
  const b = existingName.toLowerCase().trim();
  if (a === b) return true;
  if (levenshtein(a, b) <= 2) return true;
  // Check if all words of one are contained in the other
  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);
  if (wordsA.length >= 2 && wordsA.every(w => b.includes(w))) return true;
  if (wordsB.length >= 2 && wordsB.every(w => a.includes(w))) return true;
  return false;
}

export default function GroupBasicForm({ onSuccess }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [counties, setCounties] = useState([]);
  const [subCounties, setSubCounties] = useState([]);
  const [wards, setWards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [duplicateSuggestion, setDuplicateSuggestion] = useState(null);
  const [allGroups, setAllGroups] = useState([]);

  const [form, setForm] = useState({
    name: '', type: 'sacco', county_id: user?.county_id || '',
    constituency_id: '', coverage_type: 'county',
    selectedSubCounties: [], selectedWards: [],
    membership_size_band: '<50', official_role: 'chairperson',
  });

  useEffect(() => {
    base44.entities.County.filter({}).then(setCounties).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.county_id) {
      Promise.all([
        base44.entities.SubCounty.filter({ county_id: form.county_id }).catch(() => []),
        base44.entities.Ward.filter({ county_id: form.county_id }).catch(() => []),
        base44.entities.Group.filter({ county_id: form.county_id }, '-created_date', 100).catch(() => []),
      ]).then(([sc, w, g]) => {
        setSubCounties(sc); setWards(w); setAllGroups(g);
      });
    } else {
      setSubCounties([]); setWards([]); setAllGroups([]);
    }
  }, [form.county_id]);

  // Live duplicate check on name change
  useEffect(() => {
    if (!form.name.trim() || form.name.trim().length < 3 || allGroups.length === 0) {
      setDuplicateSuggestion(null);
      return;
    }
    const timer = setTimeout(() => {
      const match = allGroups.find(g => isNearDuplicate(form.name, g.name));
      setDuplicateSuggestion(match || null);
    }, 400);
    return () => clearTimeout(timer);
  }, [form.name, allGroups]);

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function toggleSubCounty(id) {
    setForm(f => ({
      ...f,
      selectedSubCounties: f.selectedSubCounties.includes(id)
        ? f.selectedSubCounties.filter(x => x !== id)
        : [...f.selectedSubCounties, id],
    }));
  }

  function toggleWard(id) {
    setForm(f => ({
      ...f,
      selectedWards: f.selectedWards.includes(id)
        ? f.selectedWards.filter(x => x !== id)
        : [...f.selectedWards, id],
    }));
  }

  function validate() {
    return form.name.trim() && form.type && form.county_id && form.official_role &&
      (form.coverage_type === 'county' || form.selectedSubCounties.length > 0 || form.selectedWards.length > 0);
  }

  async function handleSubmit() {
    if (!user) return;
    setSaving(true);
    try {
      // Determine if this is a near-duplicate
      const isDuplicate = allGroups.some(g => isNearDuplicate(form.name, g.name));

      const groupData = {
        name: form.name.trim(),
        type: form.type,
        county_id: form.county_id,
        status: 'active',
        source: 'self_registered',
        kyc_status: 'unverified',
        group_state: 'BASIC_ACTIVE',
        group_state_updated_at: new Date().toISOString(),
        coverage_type: form.coverage_type,
        coverage_sub_county_ids: form.coverage_type === 'sub_county' ? form.selectedSubCounties : [],
        coverage_ward_ids: form.coverage_type === 'ward' ? form.selectedWards : [],
        membership_size_band: form.membership_size_band,
        join_policy: 'official_approval',
        duplicate_flagged: isDuplicate,
        official_name: user.full_name || '',
        official_phone: user.phone || '',
        official_email: user.email || '',
      };

      const group = await base44.entities.Group.create(groupData);

      // Create founding official record
      await base44.entities.GroupOfficial.create({
        group_id: group.id,
        user_id: user.id,
        role: form.official_role,
        status: 'active',
        kyc_complete: user.account_state === 'VERIFIED' || user.verification_complete === true,
        invited_by_user_id: user.id,
        confirmed_at: new Date().toISOString(),
      });

      // Transition group state via backend function (audit + validation)
      try {
        await base44.functions.invoke('transitionGroupState', {
          groupId: group.id,
          event: 'group_basic_created',
          metadata: { description: `Group created by ${user.full_name} as ${form.official_role}` },
        });
      } catch (e) {
        // State already set directly; transition function just validates + audits
      }

      // If duplicate, emit duplicate.flagged audit event
      if (isDuplicate) {
        try {
          await base44.functions.invoke('transitionGroupState', {
            groupId: group.id,
            event: 'duplicate_flagged',
            metadata: {
              description: `Group name "${form.name}" is a near-duplicate of an existing group in the same county`,
              suggested_duplicate_of: allGroups.find(g => isNearDuplicate(form.name, g.name))?.id,
            },
          });
        } catch (e) {}
      }

      onSuccess(group, form.official_role);
    } catch (e) {
      toast({ title: 'Failed to create group', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="mb-1">
        <h2 className="text-base font-heading font-bold flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" /> Create Your Group
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Your group goes live instantly. Members can join right away.</p>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Group Name *</label>
        <input
          value={form.name}
          onChange={e => update('name', e.target.value)}
          placeholder="e.g. Kisumu Bodaboda SACCO"
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {duplicateSuggestion && (
          <div className="mt-1.5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800">
              A similar group "<span className="font-semibold">{duplicateSuggestion.name}</span>" already exists in this county.
              You can still create this group, but it will be flagged for admin review.
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Group Type *</label>
        <div className="grid grid-cols-4 gap-2 mt-1">
          {GROUP_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => update('type', t.value)}
              className={`px-2 py-2 rounded-xl text-xs font-medium border transition-colors ${form.type === t.value ? 'bg-primary text-white border-primary' : 'bg-card border-border text-muted-foreground'}`}
            >
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

      {form.county_id && (
        <>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Coverage Area *</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[
                { value: 'county', label: 'Whole County' },
                { value: 'sub_county', label: 'Sub-Counties' },
                { value: 'ward', label: 'Wards' },
              ].map(c => (
                <button
                  key={c.value}
                  onClick={() => update('coverage_type', c.value)}
                  className={`px-2 py-2 rounded-xl text-xs font-medium border transition-colors ${form.coverage_type === c.value ? 'bg-primary text-white border-primary' : 'bg-card border-border text-muted-foreground'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {form.coverage_type === 'sub_county' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Select Sub-Counties *</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {subCounties.map(sc => (
                  <button
                    key={sc.id}
                    onClick={() => toggleSubCounty(sc.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.selectedSubCounties.includes(sc.id) ? 'bg-primary text-white border-primary' : 'bg-card border-border text-muted-foreground'}`}
                  >
                    {sc.name}
                  </button>
                ))}
                {subCounties.length === 0 && <p className="text-xs text-muted-foreground">No sub-counties defined.</p>}
              </div>
            </div>
          )}

          {form.coverage_type === 'ward' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Select Wards *</label>
              <div className="flex flex-wrap gap-1.5 mt-1 max-h-32 overflow-y-auto">
                {wards.map(w => (
                  <button
                    key={w.id}
                    onClick={() => toggleWard(w.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.selectedWards.includes(w.id) ? 'bg-primary text-white border-primary' : 'bg-card border-border text-muted-foreground'}`}
                  >
                    {w.name}
                  </button>
                ))}
                {wards.length === 0 && <p className="text-xs text-muted-foreground">No wards defined.</p>}
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <label className="text-xs font-medium text-muted-foreground">Membership Size *</label>
        <select value={form.membership_size_band} onChange={e => update('membership_size_band', e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
          {SIZE_BANDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Your Role *</label>
        <select value={form.official_role} onChange={e => update('official_role', e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
          {OFFICIAL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!validate() || saving}
        className="w-full flex items-center justify-center gap-1 bg-success text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Create & Go Live</>}
      </button>
    </div>
  );
}
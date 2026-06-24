import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle, Users, Search } from 'lucide-react';

export default function BulkSmsPage({ countyScope = null }) {
  const { toast } = useToast();
  const isCountyScoped = !!countyScope;
  const [audience, setAudience] = useState('all');
  const [filterId, setFilterId] = useState('');
  const [individualSearch, setIndividualSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndividual, setSelectedIndividual] = useState(null);
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');
  const [counties, setCounties] = useState([]);
  const [saccos, setSaccos] = useState([]);
  const [stages, setStages] = useState([]);
  const [subCounties, setSubCounties] = useState([]);
  const [wards, setWards] = useState([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      try {
        const queries = [
          isCountyScoped ? base44.entities.County.get(countyScope) : base44.entities.County.filter({}),
          isCountyScoped ? base44.entities.Group.filter({ county_id: countyScope, type: 'sacco' }) : base44.entities.Group.filter({ type: 'sacco' }),
          isCountyScoped ? base44.entities.Stage.filter({ county_id: countyScope }) : base44.entities.Stage.filter({}),
          isCountyScoped ? base44.entities.SubCounty.filter({}) : base44.entities.SubCounty.filter({}),
          isCountyScoped ? base44.entities.Ward.filter({}) : base44.entities.Ward.filter({}),
        ];
        const [c, s, st, sc, w] = await Promise.all(queries);
        setCounties(isCountyScoped && c ? [c] : c);
        setSaccos(s);
        setStages(st);
        setSubCounties(sc);
        setWards(w);
      } catch (e) {}
    }
    loadOptions();
  }, [countyScope]);

  async function handleIndividualSearch(query) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const queryFilter = isCountyScoped ? { county_id: countyScope } : {};
      const users = await base44.entities.User.filter(queryFilter);
      const filtered = users.filter(u =>
        u.phone?.includes(query) || u.full_name?.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 10));
    } catch (e) {}
    setSearching(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => handleIndividualSearch(individualSearch), 300);
    return () => clearTimeout(timer);
  }, [individualSearch]);

  useEffect(() => {
    if (audience !== 'individual') setSelectedIndividual(null);
  }, [audience]);

  async function getRecipientCount() {
    if (audience === 'individual' && !selectedIndividual) return 0;
    if (audience !== 'all' && !filterId) return 0;
    
    try {
      const res = await base44.functions.invoke('createSmsCampaign', {
        audienceType: audience === 'all' ? 'all_riders' : audience,
        audienceFilterId: filterId || undefined,
        audiencePhone: audience === 'individual' ? selectedIndividual.phone : undefined,
        message: ' ',
        name: 'count_only',
        countyScope: isCountyScoped ? countyScope : undefined,
      });
      return res.data.recipientCount || 0;
    } catch (e) {
      return 0;
    }
  }

  useEffect(() => {
    async function countRecipients() {
      setLoading(true);
      const count = await getRecipientCount();
      setRecipientCount(count);
      setLoading(false);
    }
    countRecipients();
  }, [audience, filterId, selectedIndividual]);

  async function handleSend() {
    if (!message.trim()) {
      toast({ title: 'Message cannot be empty', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const res = await base44.functions.invoke('createSmsCampaign', {
        audienceType: audience === 'all' ? 'all_riders' : audience,
        audienceFilterId: filterId || undefined,
        audiencePhone: audience === 'individual' ? selectedIndividual.phone : undefined,
        message,
        name: campaignName || `Campaign ${new Date().toLocaleString()}`,
        countyScope: isCountyScoped ? countyScope : undefined,
      });

      toast({
        title: 'Campaign queued',
        description: `SMS will be sent to ${res.data.recipientCount} recipients in batches.`,
      });

      setMessage('');
      setCampaignName('');
      setShowConfirm(false);
    } catch (e) {
      toast({ title: 'Failed to create campaign', description: e.message, variant: 'destructive' });
    }
    setSending(false);
  }

  const estimatedCost = recipientCount * 1.0;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        {/* Campaign Name */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Campaign Name (optional)</label>
          <input
            type="text"
            value={campaignName}
            onChange={e => setCampaignName(e.target.value)}
            placeholder="e.g., Monthly Promotion"
            className="w-full mt-2 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
          />
        </div>

        {/* Audience */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Audience</label>
          <select
            value={audience}
            onChange={e => { setAudience(e.target.value); setFilterId(''); }}
            className="w-full mt-2 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
          >
            <option value="all">{isCountyScoped ? 'All County Riders' : 'All Riders'}</option>
            {!isCountyScoped && <option value="by_county">By County</option>}
            <option value="by_sacco">By SACCO</option>
            <option value="by_stage">By Stage</option>
            {!isCountyScoped && <option value="by_sub_county">By Sub-County</option>}
            {!isCountyScoped && <option value="by_ward">By Ward</option>}
            <option value="individual">Individual User</option>
          </select>
        </div>

        {/* County */}
        {audience === 'by_county' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Select County</label>
            <select
              value={filterId}
              onChange={e => setFilterId(e.target.value)}
              className="w-full mt-2 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
            >
              <option value="">— Choose —</option>
              {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {/* SACCO */}
        {audience === 'by_sacco' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Select SACCO</label>
            <select
              value={filterId}
              onChange={e => setFilterId(e.target.value)}
              className="w-full mt-2 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
            >
              <option value="">— Choose —</option>
              {saccos.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {/* Stage */}
        {audience === 'by_stage' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Select Stage</label>
            <select
              value={filterId}
              onChange={e => setFilterId(e.target.value)}
              className="w-full mt-2 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
            >
              <option value="">— Choose —</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {/* Sub-County */}
        {audience === 'by_sub_county' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Select Sub-County</label>
            <select
              value={filterId}
              onChange={e => setFilterId(e.target.value)}
              className="w-full mt-2 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
            >
              <option value="">— Choose —</option>
              {subCounties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {/* Ward */}
        {audience === 'by_ward' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Select Ward</label>
            <select
              value={filterId}
              onChange={e => setFilterId(e.target.value)}
              className="w-full mt-2 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
            >
              <option value="">— Choose —</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}

        {/* Individual User */}
        {audience === 'individual' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Search User by Name or Phone</label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={individualSearch}
                  onChange={e => setIndividualSearch(e.target.value)}
                  placeholder="Name or phone number..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm"
                />
              </div>
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-10 bg-card border border-border rounded-xl shadow-lg mt-1 w-80 max-h-48 overflow-y-auto">
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedIndividual(u); setIndividualSearch(''); setSearchResults([]); }}
                    className="w-full text-left px-3 py-2 hover:bg-accent border-b border-border/50 last:border-b-0 text-sm"
                  >
                    <p className="font-medium">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.phone}</p>
                  </button>
                ))}
              </div>
            )}
            {selectedIndividual && (
              <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{selectedIndividual.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedIndividual.phone}</p>
                </div>
                <button onClick={() => setSelectedIndividual(null)} className="text-xs text-primary hover:underline">Remove</button>
              </div>
            )}
          </div>
        )}

        {/* Recipient count */}
        <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <Users className="w-4 h-4 text-primary" />
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground">Recipients</p>
            <p className="text-sm font-bold">{recipientCount.toLocaleString()}</p>
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Enter SMS message..."
            className="w-full mt-2 px-3 py-2 rounded-xl border border-input bg-background text-sm resize-none"
            rows={4}
          />
          <p className={`text-[10px] mt-1 ${message.length > 160 ? 'text-destructive' : message.length > 0 ? 'text-success' : 'text-muted-foreground'}`}>
            {message.length} / 160 characters · {Math.ceil(message.length / 160)} SMS part(s)
          </p>
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={!message.trim() || recipientCount === 0 || loading}
          className="w-full bg-orange-500 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
        >
          Review & Send
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-warning">Campaign Cost</p>
                <p className="text-xs text-muted-foreground mt-1">Each SMS costs approximately KES 1.00</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Recipients</p>
                <p className="text-lg font-bold">{recipientCount.toLocaleString()}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Rate</p>
                <p className="text-lg font-bold">KES 1</p>
              </div>
              <div className="bg-orange-500/10 rounded-lg p-3 text-center border border-orange-500/30">
                <p className="text-xs text-muted-foreground">Est. Total</p>
                <p className="text-lg font-bold text-orange-500">KES {estimatedCost.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">Message Preview</p>
              <p className="text-sm font-mono bg-muted/50 p-2 rounded whitespace-pre-wrap break-words">{message}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Queue Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
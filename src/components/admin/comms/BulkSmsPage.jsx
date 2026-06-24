import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle, Users } from 'lucide-react';

export default function BulkSmsPage() {
  const { toast } = useToast();
  const [audience, setAudience] = useState('all');
  const [countyId, setCountyId] = useState('');
  const [saccoId, setSaccoId] = useState('');
  const [message, setMessage] = useState('');
  const [counties, setCounties] = useState([]);
  const [saccos, setSaccos] = useState([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [c, s] = await Promise.all([
          base44.entities.County.filter({}),
          base44.entities.Group.filter({ type: 'sacco' }),
        ]);
        setCounties(c);
        setSaccos(s);
      } catch (e) {}
    }
    loadOptions();
  }, []);

  useEffect(() => {
    async function countRecipients() {
      setLoading(true);
      try {
        let count = 0;
        if (audience === 'all') {
          const users = await base44.entities.User.filter({ role: 'rider' });
          count = users.length;
        } else if (audience === 'county' && countyId) {
          const users = await base44.entities.User.filter({ county_id: countyId, role: 'rider' });
          count = users.length;
        } else if (audience === 'sacco' && saccoId) {
          const members = await base44.entities.GroupMember.filter({ group_id: saccoId });
          count = members.length;
        }
        setRecipientCount(count);
      } catch (e) {}
      setLoading(false);
    }
    countRecipients();
  }, [audience, countyId, saccoId]);

  async function handleSend() {
    if (!message.trim()) {
      toast({ title: 'Message cannot be empty', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const res = await base44.functions.invoke('sendBulkSms', {
        audience,
        countyId: audience === 'county' ? countyId : undefined,
        saccoId: audience === 'sacco' ? saccoId : undefined,
        message,
        templateKey: 'bulk_custom',
      });

      toast({
        title: 'SMS Sent',
        description: `${res.data.sent} delivered, ${res.data.failed} failed out of ${res.data.total}`,
      });

      setMessage('');
      setShowConfirm(false);
    } catch (e) {
      toast({ title: 'Failed to send', variant: 'destructive' });
    }
    setSending(false);
  }

  const estimatedCost = recipientCount * 1.0; // KES 1 per SMS default estimate

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        {/* Audience */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Audience</label>
          <select
            value={audience}
            onChange={e => { setAudience(e.target.value); setCountyId(''); setSaccoId(''); }}
            className="w-full mt-2 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
          >
            <option value="all">All Riders</option>
            <option value="county">By County</option>
            <option value="sacco">By SACCO</option>
          </select>
        </div>

        {/* County picker */}
        {audience === 'county' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Select County</label>
            <select
              value={countyId}
              onChange={e => setCountyId(e.target.value)}
              className="w-full mt-2 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
            >
              <option value="">— Choose County —</option>
              {counties.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* SACCO picker */}
        {audience === 'sacco' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Select SACCO</label>
            <select
              value={saccoId}
              onChange={e => setSaccoId(e.target.value)}
              className="w-full mt-2 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
            >
              <option value="">— Choose SACCO —</option>
              {saccos.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
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
            <p className="text-xs font-medium text-muted-foreground">Estimated Recipients</p>
            <p className="text-sm font-bold">{recipientCount.toLocaleString()} riders</p>
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Enter SMS message..."
            className="w-full mt-2 px-3 py-2 rounded-xl border border-input bg-background text-sm font-mono resize-none"
            rows={4}
          />
          <p className={`text-[10px] mt-1 ${message.length > 160 ? 'text-destructive' : message.length > 0 ? 'text-success' : 'text-muted-foreground'}`}>
            {message.length} / 160 characters
          </p>
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={!message.trim() || recipientCount === 0}
          className="w-full bg-orange-500 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
        >
          Review & Send
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-warning">Sending SMS has a cost</p>
                <p className="text-xs text-muted-foreground mt-1">Each SMS costs KES 1.00 via Africa's Talking</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Recipients</p>
                <p className="text-lg font-bold">{recipientCount.toLocaleString()}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Cost per SMS</p>
                <p className="text-lg font-bold">KES 1.00</p>
              </div>
              <div className="bg-orange-500/10 rounded-lg p-3 text-center border border-orange-500/30">
                <p className="text-xs text-muted-foreground">Total Cost</p>
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
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
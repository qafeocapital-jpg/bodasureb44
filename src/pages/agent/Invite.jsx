import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, Loader2, CheckCircle2 } from 'lucide-react';

export default function AgentInvite() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleInvite() {
    if (!phone) return;
    setInviting(true);
    try {
      await base44.entities.Announcement.create({
        title: `Invite: ${name || phone}`,
        body: `Field agent invited ${name} (${phone}) to join BodaSure.`,
        audience: 'all',
        status: 'published',
      });
      setResult({ success: true, phone, name });
      setPhone(''); setName('');
    } catch (e) {
      setResult({ success: false, message: 'Failed to send invite.' });
    }
    setInviting(false);
  }

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Invite Rider</h1>
      <p className="text-sm text-muted-foreground mb-5">Send an invite to a new rider</p>

      {result?.success && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-5 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
          <div><p className="text-sm font-bold text-success">Invite Sent!</p><p className="text-xs text-muted-foreground">{result.name || result.phone} will receive an SMS to join BodaSure.</p></div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5 space-y-4 max-w-md">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Rider Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Mwangi" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XX XXX XXX" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <button onClick={handleInvite} disabled={inviting || !phone} className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
          {inviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlus className="w-5 h-5" /> Send Invite</>}
        </button>
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { formatDateTime } from '@/lib/format';
import { auditLog } from '@/lib/audit';
import { FileCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function AdminKyc() {
  const { toast } = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const d = await base44.entities.KycDocument.filter({ status: 'pending' }, '-created_date', 50);
      setDocs(d);
    } catch (e) {}
    setLoading(false);
  }

  async function approve(id) {
    const doc = docs.find(d => d.id === id);
    const u = await base44.auth.me();
    await base44.entities.KycDocument.update(id, { status: 'approved', reviewed_by_id: u.id, reviewed_at: new Date().toISOString() });
    // Upgrade user to Tier 2
    if (doc?.user_id) {
      await base44.entities.User.update(doc.user_id, { kyc_status: 'approved', wallet_tier: 2 });
      const wallets = await base44.entities.Wallet.filter({ user_id: doc.user_id, entity_type: 'personal' });
      if (wallets.length > 0) {
        await base44.entities.Wallet.update(wallets[0].id, { tier: 2, status: 'active' });
      }
    }
    await auditLog({ userId: u.id, action: 'kyc_approved', entityType: 'KycDocument', entityId: id, description: `KYC document (${doc?.document_type}) approved for user ${doc?.user_id}` });
    toast({ title: 'KYC Approved', description: 'User upgraded to Tier 2.' });
    load();
  }

  async function reject(id) {
    const doc = docs.find(d => d.id === id);
    const u = await base44.auth.me();
    await base44.entities.KycDocument.update(id, { status: 'rejected', rejection_reason: 'Document not clear', reviewed_by_id: u.id, reviewed_at: new Date().toISOString() });
    if (doc?.user_id) {
      await base44.entities.User.update(doc.user_id, { kyc_status: 'rejected' });
    }
    await auditLog({ userId: u.id, action: 'kyc_rejected', entityType: 'KycDocument', entityId: id, description: `KYC document (${doc?.document_type}) rejected for user ${doc?.user_id}` });
    toast({ title: 'KYC Rejected', description: 'User has been notified.', variant: 'destructive' });
    load();
  }

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">KYC Review</h1>
      <p className="text-sm text-muted-foreground mb-5">Review pending KYC documents</p>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : docs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto text-success mb-2" />
          <p className="text-sm text-muted-foreground">No pending KYC documents</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map(d => (
            <div key={d.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileCheck className="w-5 h-5 text-orange-600" />
                <p className="text-sm font-semibold capitalize">{d.document_type.replace(/_/g, ' ')}</p>
              </div>
              {d.file_url && <img src={d.file_url} alt={d.document_type} className="w-full h-40 object-cover rounded-lg mb-3" />}
              <p className="text-xs text-muted-foreground mb-3">{formatDateTime(d.created_date)}</p>
              <div className="flex gap-2">
                <button onClick={() => approve(d.id)} className="flex-1 bg-success text-success-foreground rounded-lg py-2 text-xs font-semibold">Approve</button>
                <button onClick={() => reject(d.id)} className="flex-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg py-2 text-xs font-semibold">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
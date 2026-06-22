import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { formatDateTime } from '@/lib/format';
import { auditLog } from '@/lib/audit';
import { FileCheck, CheckCircle2, XCircle, Clock, Users } from 'lucide-react';
import VerificationDetailSheet from '@/components/admin/VerificationDetailSheet';
import VerificationBadge from '@/components/admin/VerificationBadge';
import { getTaskStatuses, VERIFICATION_TASKS, TASK_STATUS_CONFIG } from '@/lib/verification';

export default function AdminKyc() {
  const { toast } = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectingDoc, setRejectingDoc] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [tab, setTab] = useState('pending');
  const [phase6Riders, setPhase6Riders] = useState([]);
  const [phase6Loading, setPhase6Loading] = useState(false);
  const [detailRiderId, setDetailRiderId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const d = await base44.entities.KycDocument.filter({ status: 'pending' }, '-created_date', 50);
      setDocs(d);
    } catch (e) {}
    setLoading(false);
  }

  async function loadPhase6() {
    setPhase6Loading(true);
    try {
      const res = await base44.functions.invoke('getPhase6Submissions', {});
      if (res.data?.riders) {
        setPhase6Riders(res.data.riders.map(r => ({
          ...r,
          tasks: getTaskStatuses(r.kycDocs, r.user, r.vehicle),
        })));
      }
    } catch (e) {}
    setPhase6Loading(false);
  }

  async function approve(id) {
    const doc = docs.find(d => d.id === id);
    try {
      const result = await base44.functions.invoke('processKycDecision', {
        docId: id,
        userId: doc?.user_id,
        action: 'approve',
      });
      if (result.data?.allApproved) {
        toast({ title: 'KYC Complete', description: 'All documents approved. User verified.' });
      } else {
        toast({ title: 'Document Approved', description: 'Document approved. Waiting for remaining documents.' });
      }
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  }

  function openReject(doc) {
    setRejectingDoc(doc);
    setRejectReason('');
  }

  async function confirmReject() {
    if (!rejectingDoc || rejectReason.trim().length < 10) return;
    setRejecting(true);
    try {
      await base44.functions.invoke('processKycDecision', {
        docId: rejectingDoc.id,
        userId: rejectingDoc.user_id,
        action: 'reject',
        reason: rejectReason.trim(),
      });
      toast({ title: 'Document Rejected', description: 'User has been notified.', variant: 'destructive' });
      setRejectingDoc(null);
      setRejectReason('');
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setRejecting(false);
  }

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">KYC Review</h1>
      <p className="text-sm text-muted-foreground mb-5">Review pending KYC documents</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${tab === 'pending' ? 'bg-orange-600 text-white' : 'bg-card border border-border text-muted-foreground'}`}
        >
          <FileCheck className="w-4 h-4" /> Pending Docs
          <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === 'pending' ? 'bg-white/20' : 'bg-accent'}`}>{docs.length}</span>
        </button>
        <button
          onClick={() => { setTab('phase6'); if (phase6Riders.length === 0) loadPhase6(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${tab === 'phase6' ? 'bg-orange-600 text-white' : 'bg-card border border-border text-muted-foreground'}`}
        >
          <Users className="w-4 h-4" /> Phase 6 Submissions
        </button>
      </div>

      {tab === 'pending' ? (
        loading ? (
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
                  <button onClick={() => openReject(d)} className="flex-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg py-2 text-xs font-semibold">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Phase 6 Submissions */
        phase6Loading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
        ) : phase6Riders.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No Phase 6 submissions yet</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rider</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tasks</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Plate</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {phase6Riders.map(r => (
                  <tr key={r.user.id} className="border-t border-border hover:bg-accent/50">
                    <td className="px-4 py-3 font-medium">{r.user.full_name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.user.phone || r.user.email || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {VERIFICATION_TASKS.map((task, i) => {
                          const status = r.tasks[i]?.status || 'not_started';
                          const config = TASK_STATUS_CONFIG[status];
                          return (
                            <span key={task.id} className={`text-[9px] font-semibold rounded-full px-1.5 py-0.5 ${config.bg} ${config.className}`}>
                              {task.short}: {config.label}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{r.vehicle?.plate_number || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDetailRiderId(r.user.id)} className="text-xs text-orange-600 font-semibold hover:underline">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {rejectingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !rejecting && setRejectingDoc(null)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-heading font-bold text-lg mb-1">Reject KYC Document</h3>
            <p className="text-xs text-muted-foreground mb-4 capitalize">{rejectingDoc?.document_type?.replace(/_/g, ' ')}</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Rejection Reason (min 10 characters)</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Explain why this document is being rejected..."
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-y"
                disabled={rejecting}
              />
              <p className="text-[10px] text-muted-foreground mt-1">{rejectReason.trim().length}/10 characters</p>
            </div>
            <div className="flex gap-2 pt-3">
              <button onClick={() => setRejectingDoc(null)} disabled={rejecting} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
              <button onClick={confirmReject} disabled={rejecting || rejectReason.trim().length < 10} className="flex-1 bg-destructive text-destructive-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailRiderId && (
        <VerificationDetailSheet
          riderId={detailRiderId}
          onClose={() => setDetailRiderId(null)}
          canApprove={true}
        />
      )}
    </div>
  );
}
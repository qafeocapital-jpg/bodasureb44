import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { formatDateTime } from '@/lib/format';
import { auditLog } from '@/lib/audit';
import { FileCheck, CheckCircle2, XCircle, Clock, Users, Wrench, Bike } from 'lucide-react';
import ManualRecoveryModal from '@/components/admin/ManualRecoveryModal';
import ComplianceDashboard from '@/components/admin/ComplianceDashboard';
import VerificationDetailSheet from '@/components/admin/VerificationDetailSheet';
import VerificationBadge from '@/components/admin/VerificationBadge';
import BikePhotoQueue from '@/components/admin/BikePhotoQueue';
import { getTaskStatuses, VERIFICATION_TASKS, TASK_STATUS_CONFIG } from '@/lib/verification';

export default function AdminKyc() {
  const { toast } = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectingDoc, setRejectingDoc] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [phase6Riders, setPhase6Riders] = useState([]);
  const [phase6Loading, setPhase6Loading] = useState(false);
  const [detailRiderId, setDetailRiderId] = useState(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [bikePhotoDocs, setBikePhotoDocs] = useState([]);
  const [bikePhotoLoading, setBikePhotoLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function loadBikePhotos() {
    setBikePhotoLoading(true);
    try {
      const left = await base44.entities.KycDocument.filter({ document_type: 'bike_left', status: 'pending' }, 'created_date', 50);
      const rear = await base44.entities.KycDocument.filter({ document_type: 'bike_rear', status: 'pending' }, 'created_date', 50);
      const merged = [...left, ...rear].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      const userIds = [...new Set(merged.map(d => d.user_id))];
      const [usersData, vehiclesData] = await Promise.all([
        Promise.all(userIds.map(id => base44.entities.User.filter({ id }).then(u => u[0] || null))),
        Promise.all(userIds.map(id => base44.entities.Vehicle.filter({ rider_id: id }).then(v => v[0] || null))),
      ]);
      const userMap = {};
      const vehicleMap = {};
      userIds.forEach((id, i) => { userMap[id] = usersData[i]; vehicleMap[id] = vehiclesData[i]; });
      setBikePhotoDocs(merged.map(doc => ({ ...doc, rider: userMap[doc.user_id], vehicle: vehicleMap[doc.user_id] })));
    } catch (e) {
      console.error('loadBikePhotos error:', e);
    }
    setBikePhotoLoading(false);
  }

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
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${tab === 'dashboard' ? 'bg-orange-600 text-white' : 'bg-card border border-border text-muted-foreground'}`}
        >
          <FileCheck className="w-4 h-4" /> Compliance Dashboard
        </button>
        <button
          onClick={() => { setTab('phase6'); if (phase6Riders.length === 0) loadPhase6(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${tab === 'phase6' ? 'bg-orange-600 text-white' : 'bg-card border border-border text-muted-foreground'}`}
        >
          <Users className="w-4 h-4" /> Phase 6 Submissions
        </button>
        <button
          onClick={() => { setTab('bike_photos'); loadBikePhotos(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${tab === 'bike_photos' ? 'bg-orange-600 text-white' : 'bg-card border border-border text-muted-foreground'}`}
        >
          <Bike className="w-4 h-4" /> Bike Photos
        </button>
        <button
          onClick={() => setShowRecovery(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:bg-accent ml-auto"
        >
          <Wrench className="w-4 h-4" /> Manual Recovery
        </button>
      </div>

      {tab === 'dashboard' ? (
        <ComplianceDashboard onSelectRider={(riderId) => setDetailRiderId(riderId)} />
      ) : tab === 'bike_photos' ? (
        <BikePhotoQueue docs={bikePhotoDocs} loading={bikePhotoLoading} onRefresh={loadBikePhotos} />
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

      {showRecovery && (
        <ManualRecoveryModal onClose={() => setShowRecovery(false)} />
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
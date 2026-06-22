import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { auditLog } from '@/lib/audit';
import { formatKES, formatDateTime } from '@/lib/format';
import FileDisputeSheet from '@/components/rider/FileDisputeSheet';
import { ChevronLeft, Gavel, Plus, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';

const statusConfig = {
  open: { label: 'Open', icon: Clock, color: 'bg-warning/10 text-warning' },
  under_review: { label: 'Under Review', icon: Clock, color: 'bg-blue-50 text-blue-600' },
  resolved: { label: 'Resolved', icon: CheckCircle2, color: 'bg-success/10 text-success' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'bg-destructive/10 text-destructive' },
};

const categoryLabels = {
  failed_transaction: 'Failed Transaction',
  wrong_amount: 'Wrong Amount',
  unauthorized: 'Unauthorized',
  duplicate_charge: 'Duplicate Charge',
  service_issue: 'Service Issue',
  other: 'Other',
};

export default function Disputes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFile, setShowFile] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const data = await base44.entities.Dispute.filter({ rider_id: user.id }, '-created_date', 50);
        setDisputes(data);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  async function handleFileDispute({ category, reason, description }) {
    const u = await base44.auth.me();
    await base44.entities.Dispute.create({
      rider_id: user.id,
      category,
      reason,
      description,
      status: 'open',
    });
    await auditLog({
      userId: u.id,
      action: 'dispute_filed',
      entityType: 'Dispute',
      entityId: '',
      description: `Dispute filed: ${category} — ${reason}`,
    });
    toast({ title: 'Dispute Filed', description: 'We will review your case within 48 hours.' });
    const data = await base44.entities.Dispute.filter({ rider_id: user.id }, '-created_date', 50);
    setDisputes(data);
  }

  if (loading) return <PageSkeleton variant="hero-rows" />;

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-heading font-bold">Disputes</h1>
        </div>
        <button
          onClick={() => setShowFile(true)}
          className="flex items-center gap-1 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-semibold"
        >
          <Plus className="w-4 h-4" /> File New
        </button>
      </div>

      {disputes.length === 0 ? (
        <div className="bg-accent rounded-2xl p-8 text-center">
          <Gavel className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No disputes filed</p>
          <p className="text-xs text-muted-foreground mb-4">If you have an issue with a transaction, file a dispute and we'll review it.</p>
          <button
            onClick={() => setShowFile(true)}
            className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold"
          >
            File a Dispute
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map(d => {
            const StatusIcon = statusConfig[d.status]?.icon || Clock;
            return (
              <div key={d.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                      <Gavel className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-sm">{categoryLabels[d.category] || d.category}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDateTime(d.created_date)}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold rounded-full px-2.5 py-1 flex items-center gap-1 ${statusConfig[d.status]?.color || 'bg-muted text-muted-foreground'}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig[d.status]?.label || d.status}
                  </span>
                </div>
                <p className="text-sm font-medium mb-1">{d.reason}</p>
                {d.description && <p className="text-xs text-muted-foreground mb-2">{d.description}</p>}
                {d.transaction_reference && (
                  <p className="text-[10px] text-muted-foreground">Ref: {d.transaction_reference}</p>
                )}
                {d.resolution_notes && (
                  <div className="mt-2 bg-accent rounded-lg p-2">
                    <p className="text-[10px] font-semibold text-muted-foreground">Resolution</p>
                    <p className="text-xs text-foreground">{d.resolution_notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <FileDisputeSheet
        open={showFile}
        onClose={() => setShowFile(false)}
        onSubmit={handleFileDispute}
      />
    </div>
  );
}
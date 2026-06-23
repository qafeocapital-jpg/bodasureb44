import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Map, ChevronDown, ChevronRight, Users, Check, X, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function SaccoStages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stages, setStages] = useState([]);
  const [bikes, setBikes] = useState([]);
  const [permits, setPermits] = useState([]);
  const [wards, setWards] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const saccoGroupId = user?.scope_entity_id;
  const countyId = user?.county_id;

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const [s, b, p, w] = await Promise.all([
          base44.entities.Stage.filter({ county_id: countyId }),
          base44.entities.Vehicle.filter({ county_id: countyId }),
          base44.entities.Permit.filter({ status: 'active' }),
          base44.entities.Ward.filter({ county_id: countyId }).catch(() => []),
        ]);
        setStages(s);
        setStages(s);
        setBikes(b);
        setPermits(p);
        setWards(w);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user, countyId]);

  const wardName = (wardId) => wards.find(w => w.id === wardId)?.name || '—';
  const stageBikes = (stageId) => bikes.filter(b => b.stage_id === stageId);
  const stageCompliance = (stageId) => {
    const sb = stageBikes(stageId);
    if (sb.length === 0) return 0;
    const compliant = sb.filter(b => permits.some(p => p.vehicle_id === b.id)).length;
    return Math.round((compliant / sb.length) * 100);
  };

  async function approveLeader(stageId) {
    const stage = stages.find(s => s.id === stageId);
    if (!stage?.pending_leader_id) return;
    setActing(stageId);
    try {
      await base44.entities.Stage.update(stageId, {
        application_status: 'pending_county',
        sacco_approved_at: new Date().toISOString(),
      });
      await base44.entities.Announcement.create({
        title: 'Stage Leader Application Forwarded',
        body: `Stage "${stage.name}" has a leader application pending your approval. Please review in Registrations → Stages.`,
        audience: 'county_staff',
        county_id: countyId,
        status: 'published',
      });
      toast({ title: 'Approved — sent to County', description: 'Stage leader application forwarded to County for final approval.' });
      setStages(prev => prev.map(s => s.id === stageId ? { ...s, application_status: 'pending_county', sacco_approved_at: new Date().toISOString() } : s));
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setActing(null);
  }

  async function rejectLeader(stageId) {
    const stage = stages.find(s => s.id === stageId);
    if (!stage?.pending_leader_id) return;
    setActing(stageId);
    try {
      await base44.entities.Stage.update(stageId, {
        application_status: 'rejected',
        rejection_reason: 'Rejected by SACCO',
      });
      toast({ title: 'Application rejected' });
      setStages(prev => prev.map(s => s.id === stageId ? { ...s, application_status: 'rejected', rejection_reason: 'Rejected by SACCO' } : s));
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setActing(null);
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Stage Management</h1>
      <p className="text-sm text-muted-foreground mb-5">Stages in your county and leader applications</p>

      {stages.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Map className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No stages registered in your county yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stages.map(stage => {
            const sb = stageBikes(stage.id);
            const compPct = stageCompliance(stage.id);
            const hasApp = stage.application_status === 'pending_sacco';
            const isExpanded = expanded === stage.id;
            return (
              <div key={stage.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : stage.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <div className="text-left">
                      <p className="text-sm font-semibold">{stage.name}</p>
                      <p className="text-xs text-muted-foreground">{wardName(stage.ward_id)} · {sb.length} bikes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${compPct >= 75 ? 'bg-success/10 text-success' : compPct >= 50 ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                      {compPct}% compliant
                    </span>
                    {hasApp && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                        <Clock className="w-3 h-3" /> App
                      </span>
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                    {stage.leader_id ? (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Stage Leader</p>
                        <p className="text-sm font-semibold">Assigned</p>
                      </div>
                    ) : (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Stage Leader</p>
                        <p className="text-sm font-semibold text-muted-foreground">Not assigned</p>
                      </div>
                    )}

                    {hasApp && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <p className="text-xs font-bold text-amber-900">Pending Leader Application</p>
                        </div>
                        {stage.pending_leader_note && (
                          <p className="text-xs text-amber-700 mb-2">"{stage.pending_leader_note}"</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveLeader(stage.id)}
                            disabled={acting === stage.id}
                            className="flex items-center gap-1 bg-success text-white rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                          >
                            {acting === stage.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Approve
                          </button>
                          <button
                            onClick={() => rejectLeader(stage.id)}
                            disabled={acting === stage.id}
                            className="flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                          >
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {sb.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Bikes at this stage</p>
                        <div className="space-y-1">
                          {sb.slice(0, 5).map(b => (
                            <div key={b.id} className="flex items-center justify-between text-xs">
                              <span className="font-mono">{b.plate_number}</span>
                              <span className={permits.some(p => p.vehicle_id === b.id) ? 'text-success' : 'text-destructive'}>
                                {permits.some(p => p.vehicle_id === b.id) ? '✓ Compliant' : '✗ No permit'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
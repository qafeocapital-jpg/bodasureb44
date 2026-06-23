import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDate, formatDateTime } from '@/lib/format';
import { auditLog } from '@/lib/audit';
import { Users, Bike, BadgeCheck, FileText, MapPin, ArrowLeftRight, Plus, Pencil, Clock, X, Loader2, UserCheck } from 'lucide-react';
import BikeDetailSheet from '@/components/BikeDetailSheet';
import RiderDetailSheet from '@/components/county/RiderDetailSheet';
import StageModal from '@/components/county/StageModal';
import VerificationBadge from '@/components/admin/VerificationBadge';
import VerificationDetailSheet from '@/components/admin/VerificationDetailSheet';
import { formatPhoneDisplay } from '@/lib/phone';
import { useToast } from '@/components/ui/use-toast';

export default function CountyRegistrations() {
  const { user } = useAuth();
  const [tab, setTab] = useState('riders');
  const [riders, setRiders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [pendingBikes, setPendingBikes] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailVehicleId, setDetailVehicleId] = useState(null);
  const [selectedRiderId, setSelectedRiderId] = useState(null);
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [verifyRiderId, setVerifyRiderId] = useState(null);
  const [acting, setActing] = useState(null);
  const [stageApplicants, setStageApplicants] = useState([]);
  const { toast } = useToast();

  const countyId = user?.scope_entity_id || user?.county_id;

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const vehicleFilter = countyId ? { county_id: countyId } : {};
      const stageFilter = countyId ? { county_id: countyId } : {};
      const [r, v, pending, s] = await Promise.all([
        countyId ? base44.entities.User.filter({ county_id: countyId, staff_type: 'none' }) : base44.entities.User.filter({ staff_type: 'none' }),
        base44.entities.Vehicle.filter(vehicleFilter),
        base44.entities.Vehicle.filter({ ...vehicleFilter, status: 'pending' }),
        base44.entities.Stage.filter(stageFilter),
      ]);
      setRiders(r); setVehicles(v); setPendingBikes(pending); setStages(s);

      // Fetch applicant names for pending_county stages
      const pendingApplicantIds = [...new Set(s.filter(st => st.application_status === 'pending_county' && st.pending_leader_id).map(st => st.pending_leader_id))];
      if (pendingApplicantIds.length > 0) {
        const applicantData = await Promise.all(pendingApplicantIds.map(id => base44.entities.User.get(id).catch(() => null)));
        setStageApplicants(applicantData.filter(Boolean));
      }
    } catch (e) {}
    setLoading(false);
  }

  async function approveBike(id) {
    const u = await base44.auth.me();
    await base44.entities.Vehicle.update(id, { status: 'approved', approved_at: new Date().toISOString(), approved_by_id: u.id });
    await auditLog({ userId: u.id, action: 'vehicle_approved', entityType: 'Vehicle', entityId: id, description: `Vehicle approved via Registrations page` });
    load();
  }

  async function rejectBike(id, reason) {
    const u = await base44.auth.me();
    await base44.entities.Vehicle.update(id, { status: 'rejected', rejection_reason: reason || 'Did not meet requirements' });
    await auditLog({ userId: u.id, action: 'vehicle_rejected', entityType: 'Vehicle', entityId: id, description: `Vehicle rejected via Registrations page` });
    load();
  }

  async function approveStageLeader(stageId) {
    const stage = stages.find(s => s.id === stageId);
    if (!stage?.pending_leader_id) return;
    setActing(stageId);
    try {
      const u = await base44.auth.me();
      await base44.entities.Stage.update(stageId, {
        application_status: 'approved',
        leader_id: stage.pending_leader_id,
        county_approved_at: new Date().toISOString(),
        pending_leader_id: null,
      });
      await auditLog({ userId: u.id, action: 'stage_leader_approved', entityType: 'Stage', entityId: stageId, description: `Stage leader approved for ${stage.name}` });
      toast({ title: 'Leader Approved', description: 'Stage leader has been assigned.' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setActing(null);
  }

  async function rejectStageLeader(stageId) {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;
    setActing(stageId);
    try {
      const u = await base44.auth.me();
      await base44.entities.Stage.update(stageId, {
        application_status: 'rejected',
        rejection_reason: reason,
      });
      await auditLog({ userId: u.id, action: 'stage_leader_rejected', entityType: 'Stage', entityId: stageId, description: `Stage leader rejected: ${reason}` });
      toast({ title: 'Application Rejected' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setActing(null);
  }

  async function handleStageSubmit(data) {
    const u = await base44.auth.me();
    if (editingStage) {
      await base44.entities.Stage.update(editingStage.id, {
        name: data.name,
        description: data.description,
      });
      await auditLog({ userId: u.id, action: 'stage_updated', entityType: 'Stage', entityId: editingStage.id, description: `Stage "${data.name}" updated` });
      toast({ title: 'Stage updated' });
    } else {
      const stage = await base44.entities.Stage.create({
        name: data.name,
        description: data.description,
        county_id: countyId || '',
      });
      await auditLog({ userId: u.id, action: 'stage_created', entityType: 'Stage', entityId: stage.id, description: `Stage "${data.name}" created` });
      toast({ title: 'Stage created' });
    }
    setEditingStage(null);
    load();
  }

  const applicantName = (id) => stageApplicants.find(a => a.id === id)?.full_name || 'Unknown Rider';

  const tabs = [
    { id: 'riders', label: 'Riders', icon: Users, count: riders.length },
    { id: 'vehicles', label: 'Vehicles', icon: Bike, count: vehicles.length },
    { id: 'approvals', label: 'Approvals', icon: BadgeCheck, count: pendingBikes.length },
    { id: 'stages', label: 'Stages', icon: MapPin, count: stages.length },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Registrations</h1>
      <p className="text-sm text-muted-foreground mb-5">Manage rider and vehicle registrations</p>

      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-emerald-600 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === t.id ? 'bg-white/20' : 'bg-accent'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : tab === 'riders' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">KYC</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Verification</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {riders.map(r => (
                <tr key={r.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">{r.full_name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.phone ? formatPhoneDisplay(r.phone) : r.email || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${r.kyc_status === 'approved' ? 'bg-success/10 text-success' : r.kyc_status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{r.kyc_status || 'none'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <VerificationBadge user={r} onClick={() => setVerifyRiderId(r.id)} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(r.created_date)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelectedRiderId(r.id)} className="text-xs text-emerald-600 font-semibold hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {riders.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No riders registered</p>}
        </div>
      ) : tab === 'vehicles' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plate</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Make</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Registered</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} onClick={() => setDetailVehicleId(v.id)} className="border-t border-border hover:bg-accent/50 cursor-pointer">
                  <td className="px-4 py-3 font-semibold">{v.plate_number}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{v.make} {v.color}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${v.status === 'approved' ? 'bg-success/10 text-success' : v.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{v.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(v.created_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {vehicles.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No vehicles registered</p>}
        </div>
      ) : tab === 'approvals' ? (
        <div className="space-y-3">
          {pendingBikes.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <BadgeCheck className="w-10 h-10 mx-auto text-success mb-2" />
              <p className="text-sm text-muted-foreground">No pending approvals</p>
            </div>
          ) : (
            pendingBikes.map(b => (
              <div key={b.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {b.bike_photo_url && <img src={b.bike_photo_url} alt={b.plate_number} className="w-14 h-14 rounded-lg object-cover" />}
                    <div>
                      <p className="font-heading font-bold">{b.plate_number}</p>
                      <p className="text-xs text-muted-foreground">{b.make} · {b.color} · {b.year || '—'}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(b.created_date)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setDetailVehicleId(b.id)} className="bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg px-4 py-2 text-xs font-semibold hover:bg-emerald-100">View</button>
                    <button onClick={() => approveBike(b.id)} className="bg-success text-success-foreground rounded-lg px-4 py-2 text-xs font-semibold hover:bg-success/90">Approve</button>
                    <button onClick={() => rejectBike(b.id)} className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-2 text-xs font-semibold hover:bg-destructive/20">Reject</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === 'stages' && (
        <div>
          {/* Pending County Approvals */}
          {stages.filter(s => s.application_status === 'pending_county').length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-amber-600" />
                <h2 className="font-heading font-bold">Pending Approvals</h2>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                  {stages.filter(s => s.application_status === 'pending_county').length}
                </span>
              </div>
              <div className="space-y-3">
                {stages.filter(s => s.application_status === 'pending_county').map(stage => (
                  <div key={stage.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-amber-600" />
                          <p className="font-heading font-bold">{stage.name}</p>
                        </div>
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          <p>Applicant: <span className="font-medium text-foreground">{applicantName(stage.pending_leader_id)}</span></p>
                          {stage.pending_leader_note && <p className="italic">"{stage.pending_leader_note}"</p>}
                          {stage.sacco_approved_at && <p>Forwarded by SACCO: {formatDateTime(stage.sacco_approved_at)}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => approveStageLeader(stage.id)}
                          disabled={acting === stage.id}
                          className="flex items-center gap-1 bg-success text-white rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
                        >
                          {acting === stage.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                          Approve &amp; Assign
                        </button>
                        <button
                          onClick={() => rejectStageLeader(stage.id)}
                          disabled={acting === stage.id}
                          className="flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
                        >
                          <X className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end mb-3">
            <button onClick={() => { setEditingStage(null); setShowStageModal(true); }} className="flex items-center gap-1 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-semibold">
              <Plus className="w-4 h-4" /> Add Stage
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stages.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <p className="font-heading font-bold text-sm">{s.name}</p>
                  </div>
                  <button onClick={() => { setEditingStage(s); setShowStageModal(true); }} className="text-muted-foreground hover:text-foreground p-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{s.member_count || 0} members</p>
                {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
              </div>
            ))}
            {stages.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">No stages registered</p>}
          </div>
        </div>
      )}

      {detailVehicleId && (
        <BikeDetailSheet vehicleId={detailVehicleId} onClose={() => setDetailVehicleId(null)} isStaff accent="emerald" />
      )}

      <RiderDetailSheet riderId={selectedRiderId} onClose={() => setSelectedRiderId(null)} />

      <StageModal
        open={showStageModal}
        onClose={() => { setShowStageModal(false); setEditingStage(null); }}
        onSubmit={handleStageSubmit}
        editingStage={editingStage}
        countyId={countyId}
      />

      {verifyRiderId && (
        <VerificationDetailSheet riderId={verifyRiderId} onClose={() => setVerifyRiderId(null)} canApprove={false} />
      )}
    </div>
  );
}
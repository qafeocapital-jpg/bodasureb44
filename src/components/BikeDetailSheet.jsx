import { useEffect, useState } from 'react';
import { X, Bike as BikeIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { auditLog } from '@/lib/audit';
import BikeInfoTab from '@/components/bike-detail/BikeInfoTab';
import RiderTab from '@/components/bike-detail/RiderTab';
import PermitTab from '@/components/bike-detail/PermitTab';
import InspectionTab from '@/components/bike-detail/InspectionTab';

const accentMap = {
  orange: { bg: 'bg-primary', fg: 'text-primary-foreground', solidBtn: 'bg-primary text-primary-foreground' },
  emerald: { bg: 'bg-emerald-600', fg: 'text-white', solidBtn: 'bg-emerald-600 text-white' },
  blue: { bg: 'bg-blue-600', fg: 'text-white', solidBtn: 'bg-blue-600 text-white' },
};

const tabs = [
  { id: 'info', label: 'Bike Info' },
  { id: 'rider', label: 'Assigned Rider' },
  { id: 'permit', label: 'Permit Status' },
  { id: 'inspection', label: 'Inspections' },
];

export default function BikeDetailSheet({ vehicleId, onClose, isStaff = false, accent = 'orange' }) {
  const { toast } = useToast();
  const a = accentMap[accent] || accentMap.orange;
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState(null);
  const [owner, setOwner] = useState(null);
  const [rider, setRider] = useState(null);
  const [users, setUsers] = useState({});
  const [permits, setPermits] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [county, setCounty] = useState(null);
  const [stage, setStage] = useState(null);

  useEffect(() => {
    if (!vehicleId) return;
    load();
  }, [vehicleId]);

  async function load() {
    setLoading(true);
    try {
      const vRes = await base44.entities.Vehicle.filter({ id: vehicleId });
      const v = vRes[0];
      if (!v) { setLoading(false); return; }

      const [permitsRes, inspectionsRes] = await Promise.all([
        base44.entities.Permit.filter({ vehicle_id: vehicleId }, '-created_date'),
        base44.entities.Inspection.filter({ vehicle_id: vehicleId }, '-inspected_at'),
      ]);

      const userMap = {};
      const userIds = [v.owner_id, v.rider_id].filter(Boolean);
      const inspectorIds = [...new Set(inspectionsRes.map(i => i.inspector_id).filter(Boolean))];
      const allUserIds = [...new Set([...userIds, ...inspectorIds])];
      await Promise.all(allUserIds.map(async uid => {
        try {
          const u = await base44.entities.User.filter({ id: uid });
          if (u.length > 0) userMap[uid] = u[0];
        } catch (e) {}
      }));

      let countyData = null, stageData = null;
      if (v.county_id) {
        try { const c = await base44.entities.County.filter({ id: v.county_id }); countyData = c[0] || null; } catch (e) {}
      }
      if (v.stage_id) {
        try { const s = await base44.entities.Stage.filter({ id: v.stage_id }); stageData = s[0] || null; } catch (e) {}
      }

      setVehicle(v);
      setOwner(userMap[v.owner_id] || null);
      setRider(userMap[v.rider_id] || null);
      setUsers(userMap);
      setPermits(permitsRes);
      setInspections(inspectionsRes);
      setCounty(countyData);
      setStage(stageData);
    } catch (e) {}
    setLoading(false);
  }

  async function handleApprove() {
    try {
      const u = await base44.auth.me();
      await base44.entities.Vehicle.update(vehicleId, { status: 'approved', approved_at: new Date().toISOString(), approved_by_id: u.id });
      await auditLog({ userId: u.id, action: 'vehicle_approved', entityType: 'Vehicle', entityId: vehicleId, description: `Vehicle ${vehicle?.plate_number} approved` });
      toast({ title: 'Bike approved', description: `${vehicle.plate_number} has been approved.` });
      load();
    } catch (e) {
      toast({ title: 'Failed to approve', description: e.message, variant: 'destructive' });
    }
  }

  async function handleReject() {
    try {
      const u = await base44.auth.me();
      await base44.entities.Vehicle.update(vehicleId, { status: 'rejected', rejection_reason: 'Did not meet requirements' });
      await auditLog({ userId: u.id, action: 'vehicle_rejected', entityType: 'Vehicle', entityId: vehicleId, description: `Vehicle ${vehicle?.plate_number} rejected` });
      toast({ title: 'Bike rejected', description: `${vehicle.plate_number} has been rejected.` });
      load();
    } catch (e) {
      toast({ title: 'Failed to reject', description: e.message, variant: 'destructive' });
    }
  }

  async function handleIssuePermit() {
    if (!vehicle) return;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30);
    try {
      await base44.entities.Permit.create({
        vehicle_id: vehicleId,
        rider_id: vehicle.rider_id || vehicle.owner_id,
        county_id: vehicle.county_id,
        billing_cycle: 'monthly',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        issued_manually: true,
        qr_code_data: `BODASURE-${vehicleId}-${Date.now()}`,
      });
      toast({ title: 'Permit issued', description: 'A monthly permit has been issued manually.' });
      load();
    } catch (e) {
      toast({ title: 'Failed to issue permit', description: e.message, variant: 'destructive' });
    }
  }

  const certificateUrl = !isStaff ? `/app/bikes/${vehicleId}/certificate` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-slide-up sm:animate-fade-in">
        <div className={`flex items-center justify-between px-5 py-4 border-b border-border ${a.bg} ${a.fg}`}>
          <div className="flex items-center gap-2">
            <BikeIcon className="w-5 h-5" />
            <h2 className="font-heading font-bold">{vehicle?.plate_number || 'Bike Details'}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === t.id ? `${a.bg} ${a.fg}` : 'bg-muted text-muted-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : !vehicle ? (
            <p className="text-sm text-muted-foreground text-center py-10">Vehicle not found</p>
          ) : activeTab === 'info' ? (
            <BikeInfoTab vehicle={vehicle} county={county} stage={stage} isStaff={isStaff} onApprove={handleApprove} onReject={handleReject} accent={accent} />
          ) : activeTab === 'rider' ? (
            <RiderTab owner={owner} rider={rider} vehicle={vehicle} />
          ) : activeTab === 'permit' ? (
            <PermitTab permits={permits} isStaff={isStaff} onIssuePermit={handleIssuePermit} accent={accent} certificateUrl={certificateUrl} />
          ) : (
            <InspectionTab inspections={inspections} users={users} />
          )}
        </div>
      </div>
    </div>
  );
}
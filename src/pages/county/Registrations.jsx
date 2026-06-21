import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate, formatDateTime } from '@/lib/format';
import { Users, Bike, BadgeCheck, FileText, MapPin, ArrowLeftRight } from 'lucide-react';
import BikeDetailSheet from '@/components/BikeDetailSheet';

export default function CountyRegistrations() {
  const [tab, setTab] = useState('riders');
  const [riders, setRiders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [pendingBikes, setPendingBikes] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailVehicleId, setDetailVehicleId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [r, v, pending, s] = await Promise.all([
        base44.entities.User.filter({ staff_type: 'none' }),
        base44.entities.Vehicle.filter({}),
        base44.entities.Vehicle.filter({ status: 'pending' }),
        base44.entities.Stage.filter({}),
      ]);
      setRiders(r); setVehicles(v); setPendingBikes(pending); setStages(s);
    } catch (e) {}
    setLoading(false);
  }

  async function approveBike(id) {
    await base44.entities.Vehicle.update(id, { status: 'approved', approved_at: new Date().toISOString() });
    load();
  }

  async function rejectBike(id, reason) {
    await base44.entities.Vehicle.update(id, { status: 'rejected', rejection_reason: reason || 'Did not meet requirements' });
    load();
  }

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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {riders.map(r => (
                <tr key={r.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">{r.full_name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.phone || r.email || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${r.kyc_status === 'approved' ? 'bg-success/10 text-success' : r.kyc_status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{r.kyc_status || 'none'}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(r.created_date)}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-xs text-emerald-600 font-semibold hover:underline">View</button>
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stages.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <p className="font-heading font-bold text-sm">{s.name}</p>
              </div>
              <p className="text-xs text-muted-foreground">{s.member_count || 0} members</p>
              {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
            </div>
          ))}
          {stages.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">No stages registered</p>}
        </div>
      )}

      {detailVehicleId && (
        <BikeDetailSheet vehicleId={detailVehicleId} onClose={() => setDetailVehicleId(null)} isStaff accent="emerald" />
      )}
    </div>
  );
}
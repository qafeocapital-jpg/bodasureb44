import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatKES, formatDateTime, formatDate } from '@/lib/format';
import { auditLog } from '@/lib/audit';
import {
  QrCode, AlertCircle, Users, Map, FileText, Search,
  ShieldCheck, ShieldX, ChevronDown, ChevronRight, Bell, X, Loader2,
} from 'lucide-react';

export default function CountyEnforcement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [tab, setTab] = useState('field_check');
  const [loading, setLoading] = useState(true);

  const [penalties, setPenalties] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [permits, setPermits] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [subCounties, setSubCounties] = useState([]);
  const [wards, setWards] = useState([]);
  const [stages, setStages] = useState([]);
  const [saccos, setSaccos] = useState([]);
  const [saccoMemberRiders, setSaccoMemberRiders] = useState({});
  const [riders, setRiders] = useState([]);
  const [penaltyFilter, setPenaltyFilter] = useState('all');
  const [assigningZone, setAssigningZone] = useState(null);

  // Field check
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [penaltyForm, setPenaltyForm] = useState({ amount: '', reason: '' });
  const [issuing, setIssuing] = useState(false);

  // Compliance map
  const [expandedSacco, setExpandedSacco] = useState(null);
  const [expandedStage, setExpandedStage] = useState(null);

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const vehicleFilter = countyId ? { county_id: countyId, status: 'approved' } : { status: 'approved' };
      const permitFilter = countyId ? { county_id: countyId, status: 'active' } : { status: 'active' };
      const [p, i, v, perms, fa, sc, w, st, grps, r] = await Promise.all([
        base44.entities.Penalty.filter(countyId ? { county_id: countyId } : {}, '-created_date', 50),
        base44.entities.Inspection.filter(countyId ? { county_id: countyId } : {}, '-created_date', 50),
        base44.entities.Vehicle.filter(vehicleFilter),
        base44.entities.Permit.filter(permitFilter),
        countyId ? base44.entities.User.filter({ county_id: countyId, role: 'field_agent' }) : base44.entities.User.filter({ role: 'field_agent' }),
        countyId ? base44.entities.SubCounty.filter({ county_id: countyId }).catch(() => []) : Promise.resolve([]),
        countyId ? base44.entities.Ward.filter({ county_id: countyId }).catch(() => []) : Promise.resolve([]),
        countyId ? base44.entities.Stage.filter({ county_id: countyId }).catch(() => []) : Promise.resolve([]),
        countyId ? base44.entities.Group.filter({ county_id: countyId }) : base44.entities.Group.filter({}),
        countyId ? base44.entities.User.filter({ county_id: countyId, staff_type: 'none' }) : base44.entities.User.filter({ staff_type: 'none' }),
      ]);
      setPenalties(p); setInspections(i); setVehicles(v); setPermits(perms);
      setOfficers(fa); setSubCounties(sc); setWards(w); setStages(st);
      setSaccos(grps.filter(g => g.type === 'sacco')); setRiders(r);

      const saccoList = grps.filter(g => g.type === 'sacco');
      const memberMap = {};
      await Promise.all(saccoList.map(async sacco => {
        try {
          const members = await base44.entities.GroupMember.filter({ group_id: sacco.id, status: 'approved' });
          memberMap[sacco.id] = new Set(members.map(m => m.user_id).filter(Boolean));
        } catch { memberMap[sacco.id] = new Set(); }
      }));
      setSaccoMemberRiders(memberMap);
    } catch (e) { console.error('Enforcement load error:', e); }
    setLoading(false);
  }

  function handleSearch() {
    if (!searchQuery) return;
    const q = searchQuery.toLowerCase();
    const found = vehicles.find(v => v.plate_number.toLowerCase().includes(q));
    setSearchResult(found || null);
  }

  async function issuePenalty() {
    if (!searchResult || !penaltyForm.amount) return;
    setIssuing(true);
    try {
      const u = await base44.auth.me();
      const amountCents = Math.round(parseFloat(penaltyForm.amount) * 100);
      await base44.entities.Penalty.create({
        rider_id: searchResult.rider_id || '',
        vehicle_id: searchResult.id,
        county_id: searchResult.county_id || countyId || '',
        amount_cents: amountCents,
        reason: penaltyForm.reason || 'Non-compliance — no valid permit',
        status: 'pending',
        issued_by_id: u.id,
        issued_at: new Date().toISOString(),
      });
      await auditLog({ userId: u.id, action: 'penalty_issued', entityType: 'Vehicle', entityId: searchResult.id, description: `Penalty issued for vehicle ${searchResult.plate_number}` });
      toast({ title: 'Penalty Issued', description: `${searchResult.plate_number} — KES ${penaltyForm.amount}` });
      setShowPenaltyModal(false);
      setPenaltyForm({ amount: '', reason: '' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setIssuing(false);
  }

  async function assignZone(officerId, zoneType, zoneId) {
    setAssigningZone(officerId);
    try {
      await base44.entities.User.update(officerId, { zone_type: zoneType || null, zone_id: zoneId || null });
      toast({ title: 'Zone assigned', description: 'Officer zone updated.' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
    setAssigningZone(null);
  }

  async function notifyNonCompliant(stageId) {
    try {
      const stageBikes = vehicles.filter(v => v.stage_id === stageId);
      const nonCompliant = stageBikes.filter(b => !permits.some(p => p.vehicle_id === b.id));
      const notified = [];
      for (const bike of nonCompliant.slice(0, 20)) {
        if (bike.rider_id) {
          const rider = await base44.entities.User.get(bike.rider_id).catch(() => null);
          if (rider?.phone) {
            await base44.functions.invoke('sendSms', {
              phone: rider.phone,
              message: `Hello ${rider.full_name || 'Rider'}, your bodaboda permit for ${bike.plate_number} is not active. Please renew via BodaSure to avoid penalties.`,
              templateKey: 'compliance_reminder',
              eventType: 'compliance_reminder',
            });
            notified.push(bike.plate_number);
          }
        }
      }
      toast({ title: 'Notifications sent', description: `${notified.length} non-compliant riders notified.` });
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  }

  const zoneLabel = (zoneType, zoneId) => {
    if (!zoneType || !zoneId) return 'Unassigned';
    const source = zoneType === 'sub_county' ? subCounties : zoneType === 'ward' ? wards : zoneType === 'stage' ? stages : [];
    return source.find(s => s.id === zoneId)?.name || 'Unknown';
  };

  const riderMap = new Map(riders.map(r => [r.id, r]));
  const officerMap = new Map(officers.map(o => [o.id, o]));
  const now = new Date();
  const activePermitVehicleIds = new Set(permits.filter(p => p.status === 'active' && (!p.end_date || new Date(p.end_date) > now)).map(p => p.vehicle_id));

  const filteredPenalties = penalties.filter(p => penaltyFilter === 'all' || p.status === penaltyFilter);

  const tabs = [
    { id: 'field_check', label: 'Field Check', icon: QrCode },
    { id: 'penalties', label: 'Penalties', icon: AlertCircle },
    { id: 'staff_zones', label: 'Staff & Zones', icon: Users },
    { id: 'compliance_map', label: 'Compliance Map', icon: Map },
    { id: 'inspections', label: 'Inspections', icon: FileText },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Enforcement</h1>
      <p className="text-sm text-muted-foreground mb-5">Field checks, penalties, and staff management</p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-[#ff5a1f] text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : tab === 'field_check' ? (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-heading font-bold mb-3">Field Check — Search by Plate</h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter plate number..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5a1f]/30"
                />
              </div>
              <button onClick={handleSearch} className="bg-[#ff5a1f] text-white rounded-xl px-5 py-2.5 text-sm font-semibold">Search</button>
            </div>
            {searchResult && (
              <div className="mt-4 border-t border-border pt-4">
                {(() => {
                  const hasPermit = activePermitVehicleIds.has(searchResult.id);
                  const rider = riderMap.get(searchResult.rider_id);
                  const vehiclePermits = permits.filter(p => p.vehicle_id === searchResult.id);
                  const activePermit = vehiclePermits.find(p => p.status === 'active' && (!p.end_date || new Date(p.end_date) > now));
                  return (
                    <div>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="font-heading font-bold text-lg">{searchResult.plate_number}</p>
                          <p className="text-xs text-muted-foreground">{searchResult.make} {searchResult.model} · {searchResult.color}</p>
                          <p className="text-xs text-muted-foreground mt-1">Rider: <span className="font-medium">{rider?.full_name || 'Unknown'}</span></p>
                          {activePermit && (
                            <p className="text-xs text-muted-foreground">Permit: <span className="font-semibold text-green-600">Active</span> — valid until {formatDate(activePermit.end_date)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1 text-sm font-semibold rounded-full px-3 py-1.5 ${hasPermit ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {hasPermit ? <ShieldCheck className="w-4 h-4" /> : <ShieldX className="w-4 h-4" />}
                            {hasPermit ? 'Compliant' : 'Non-Compliant'}
                          </span>
                          {!hasPermit && (
                            <button onClick={() => setShowPenaltyModal(true)} className="bg-red-600 text-white rounded-lg px-4 py-2 text-xs font-semibold">Issue Penalty</button>
                          )}
                        </div>
                      </div>

                      {/* Last inspections */}
                      {inspections.filter(i => i.vehicle_id === searchResult.id).length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Recent Inspections</p>
                          <div className="space-y-1.5">
                            {inspections.filter(i => i.vehicle_id === searchResult.id).slice(0, 5).map(insp => (
                              <div key={insp.id} className="flex items-center justify-between text-xs">
                                <span className={`font-semibold rounded-full px-2 py-0.5 ${insp.result === 'compliant' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{insp.result}</span>
                                <span className="text-muted-foreground">{insp.notes || '—'}</span>
                                <span className="text-muted-foreground">{formatDateTime(insp.inspected_at)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            {searchResult === null && searchQuery && (
              <p className="mt-4 text-sm text-muted-foreground text-center">No vehicle found with plate "{searchQuery}"</p>
            )}
          </div>
        </div>
      ) : tab === 'penalties' ? (
        <div>
          <div className="flex gap-2 mb-3 flex-wrap">
            {['all', 'pending', 'paid', 'disputed', 'waived'].map(status => (
              <button key={status} onClick={() => setPenaltyFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${penaltyFilter === status ? 'bg-[#ff5a1f] text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Rider</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Issued</th>
                </tr>
              </thead>
              <tbody>
                {filteredPenalties.map(p => (
                  <tr key={p.id} className="border-t border-border hover:bg-accent/50">
                    <td className="px-4 py-3 font-semibold">{formatKES(p.amount_cents)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">{riderMap.get(p.rider_id)?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${p.status === 'paid' ? 'bg-success/10 text-success' : p.status === 'pending' ? 'bg-warning/10 text-warning' : p.status === 'disputed' ? 'bg-blue-50 text-blue-700' : 'bg-muted text-muted-foreground'}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{formatDate(p.issued_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPenalties.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No penalties found</p>}
          </div>
        </div>
      ) : tab === 'staff_zones' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-heading font-bold">Field Officers ({officers.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Officer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Zone Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Zone</th>
              </tr>
            </thead>
            <tbody>
              {officers.map(o => (
                <tr key={o.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{o.full_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{o.phone || o.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <select
                      value={o.zone_type || ''}
                      onChange={e => assignZone(o.id, e.target.value, o.zone_id)}
                      disabled={assigningZone === o.id}
                      className="px-2 py-1 rounded-lg border border-input bg-background text-xs"
                    >
                      <option value="">Unassigned</option>
                      <option value="sub_county">Sub-County</option>
                      <option value="ward">Ward</option>
                      <option value="stage">Stage</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={o.zone_id || ''}
                      onChange={e => assignZone(o.id, o.zone_type, e.target.value)}
                      disabled={assigningZone === o.id || !o.zone_type}
                      className="px-2 py-1 rounded-lg border border-input bg-background text-xs max-w-[160px]"
                    >
                      <option value="">{zoneLabel(o.zone_type, o.zone_id)}</option>
                      {o.zone_type === 'sub_county' && subCounties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      {o.zone_type === 'ward' && wards.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      {o.zone_type === 'stage' && stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {officers.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No field officers assigned to this county</p>}
        </div>
      ) : tab === 'compliance_map' ? (
        <div className="space-y-3">
          {saccos.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Map className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No SACCOs in this county yet</p>
            </div>
          ) : (
            saccos.map(sacco => {
              const sBikes = vehicles.filter(v => v.county_id === countyId && saccoMemberRiders[sacco.id]?.has(v.rider_id));
              const compliant = sBikes.filter(b => activePermitVehicleIds.has(b.id)).length;
              const compPct = sBikes.length > 0 ? Math.round((compliant / sBikes.length) * 100) : 0;
              const isExpanded = expandedSacco === sacco.id;
              return (
                <div key={sacco.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedSacco(isExpanded ? null : sacco.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50">
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      <p className="text-sm font-semibold">{sacco.name}</p>
                    </div>
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${compPct >= 75 ? 'bg-success/10 text-success' : compPct >= 50 ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{compPct}% compliant</span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-border pt-2 space-y-2">
                      {stages.map(stage => {
                        const stBikes = vehicles.filter(v => v.stage_id === stage.id);
                        const stCompliant = stBikes.filter(b => activePermitVehicleIds.has(b.id)).length;
                        const stPct = stBikes.length > 0 ? Math.round((stCompliant / stBikes.length) * 100) : 0;
                        const nonCompliant = stBikes.filter(b => !activePermitVehicleIds.has(b.id));
                        const stExpanded = expandedStage === stage.id;
                        return (
                          <div key={stage.id} className="bg-muted/30 rounded-lg">
                            <button onClick={() => setExpandedStage(stExpanded ? null : stage.id)} className="w-full flex items-center justify-between px-3 py-2">
                              <div className="flex items-center gap-2">
                                {stExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                                <span className="text-xs font-medium">{stage.name}</span>
                              </div>
                              <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${stPct >= 75 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{stPct}%</span>
                            </button>
                            {stExpanded && (
                              <div className="px-3 pb-3 space-y-1">
                                {nonCompliant.length > 0 && (
                                  <button onClick={() => notifyNonCompliant(stage.id)} className="flex items-center gap-1 text-[10px] font-semibold text-[#ff5a1f] bg-orange-50 rounded-full px-2 py-1 mb-1">
                                    <Bell className="w-3 h-3" /> Notify All Non-Compliant
                                  </button>
                                )}
                                {nonCompliant.length === 0 ? (
                                  <p className="text-[10px] text-muted-foreground">All bikes compliant ✓</p>
                                ) : (
                                  nonCompliant.map(b => (
                                    <div key={b.id} className="flex items-center justify-between text-[10px] py-0.5">
                                      <span className="font-mono">{b.plate_number}</span>
                                      <span className="text-destructive">No permit</span>
                                    </div>
                                  ))
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
            })
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Result</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Officer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map(i => (
                <tr key={i.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${i.result === 'compliant' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{i.result}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{i.notes || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{officerMap.get(i.officer_id)?.full_name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDateTime(i.inspected_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {inspections.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No inspections recorded</p>}
        </div>
      )}

      {/* Issue Penalty Modal */}
      {showPenaltyModal && searchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPenaltyModal(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">Issue Penalty</h3>
              <button onClick={() => setShowPenaltyModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Vehicle: <span className="font-semibold text-foreground">{searchResult.plate_number}</span></p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Amount (KES)</label>
                <input type="number" value={penaltyForm.amount} onChange={e => setPenaltyForm(f => ({ ...f, amount: e.target.value }))} placeholder="500" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Reason</label>
                <textarea value={penaltyForm.reason} onChange={e => setPenaltyForm(f => ({ ...f, reason: e.target.value }))} placeholder="Non-compliance — no valid permit" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" rows={3} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowPenaltyModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={issuePenalty} disabled={!penaltyForm.amount || issuing} className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                  {issuing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Issue Penalty'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatKES, formatDateTime, formatDate } from '@/lib/format';
import { auditLog } from '@/lib/audit';
import { ShieldAlert, QrCode, AlertCircle, FileText, Search, Users, Map, Building2, ChevronDown, ChevronRight, Flag, Bell, UserPlus, Loader2, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function CountyEnforcement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('field_check');
  const [penalties, setPenalties] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  // Staff & Zones
  const [officers, setOfficers] = useState([]);
  const [subCounties, setSubCounties] = useState([]);
  const [wards, setWards] = useState([]);
  const [stages, setStages] = useState([]);
  const [assigningZone, setAssigningZone] = useState(null);

  // Compliance Map
  const [saccos, setSaccos] = useState([]);
  const [saccoBikes, setSaccoBikes] = useState({});
  const [permits, setPermits] = useState([]);
  const [saccoMemberRiders, setSaccoMemberRiders] = useState({});
  const [expandedSacco, setExpandedSacco] = useState(null);
  const [expandedStage, setExpandedStage] = useState(null);

  // Groups Registry
  const [groups, setGroups] = useState([]);
  const [riders, setRiders] = useState([]);

  const countyId = user?.scope_entity_id || user?.county_id;

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const penaltyFilter = countyId ? { county_id: countyId } : {};
      const inspectionFilter = countyId ? { county_id: countyId } : {};
      const vehicleFilter = countyId ? { county_id: countyId, status: 'approved' } : { status: 'approved' };
      const permitFilter = countyId ? { county_id: countyId, status: 'active' } : { status: 'active' };
      const [p, i, v, fa, sc, w, st, grps, allPermits] = await Promise.all([
        base44.entities.Penalty.filter(penaltyFilter, '-created_date', 20),
        base44.entities.Inspection.filter(inspectionFilter, '-created_date', 20),
        base44.entities.Vehicle.filter(vehicleFilter),
        countyId ? base44.entities.User.filter({ county_id: countyId, role: 'field_agent' }) : base44.entities.User.filter({ role: 'field_agent' }),
        countyId ? base44.entities.SubCounty.filter({ county_id: countyId }).catch(() => []) : Promise.resolve([]),
        countyId ? base44.entities.Ward.filter({ county_id: countyId }).catch(() => []) : Promise.resolve([]),
        countyId ? base44.entities.Stage.filter({ county_id: countyId }).catch(() => []) : Promise.resolve([]),
        countyId ? base44.entities.Group.filter({ county_id: countyId }) : base44.entities.Group.filter({}),
        base44.entities.Permit.filter(permitFilter),
      ]);
      setPenalties(p); setInspections(i); setVehicles(v);
      setOfficers(fa); setSubCounties(sc); setWards(w); setStages(st); setGroups(grps);
      setPermits(allPermits);
      setSaccos(grps.filter(g => g.type === 'sacco'));

      // Resolve SACCO member rider IDs for compliance map filtering
      const saccoList = grps.filter(g => g.type === 'sacco');
      const memberMap = {};
      await Promise.all(saccoList.map(async (sacco) => {
        try {
          const members = await base44.entities.GroupMember.filter({ group_id: sacco.id, status: 'approved' });
          memberMap[sacco.id] = new Set(members.map(m => m.user_id).filter(Boolean));
        } catch { memberMap[sacco.id] = new Set(); }
      }));
      setSaccoMemberRiders(memberMap);
    } catch (e) {}
    setLoading(false);
  }

  async function handleSearch() {
    if (!searchQuery) return;
    const q = searchQuery.toLowerCase();
    const found = vehicles.find(v => v.plate_number.toLowerCase().includes(q));
    setSearchResult(found || null);
  }

  async function issuePenalty(vehicleId) {
    const u = await base44.auth.me();
    await base44.entities.Penalty.create({
      rider_id: searchResult?.rider_id || '',
      vehicle_id: vehicleId,
      county_id: searchResult?.county_id || countyId || '',
      amount_cents: 50000,
      reason: 'Non-compliance — no valid permit',
      status: 'pending',
      issued_by_id: u.id,
      issued_at: new Date().toISOString(),
    });
    await auditLog({ userId: u.id, action: 'penalty_issued', entityType: 'Vehicle', entityId: vehicleId, description: `Penalty issued for vehicle ${searchResult?.plate_number || vehicleId}` });
    load();
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

  async function flagGroup(groupId, reason) {
    try {
      const group = groups.find(g => g.id === groupId);
      await base44.entities.Group.update(groupId, { status: 'inactive', description: `${group?.description || ''} [FLAGGED: ${reason}]`.trim() });
      toast({ title: 'Group flagged' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  }

  async function notifyNonCompliant(stageId) {
    try {
      await base44.entities.Announcement.create({
        title: 'Compliance Notice',
        body: 'Your permit has expired or is missing. Please renew immediately to avoid penalties.',
        county_id: countyId,
        audience: 'riders',
        status: 'published',
      });
      toast({ title: 'Notifications sent', description: 'Non-compliant riders notified.' });
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  }

  const zoneLabel = (zoneType, zoneId) => {
    if (!zoneType || !zoneId) return 'Unassigned';
    const source = zoneType === 'sub_county' ? subCounties : zoneType === 'ward' ? wards : zoneType === 'stage' ? stages : [];
    return source.find(s => s.id === zoneId)?.name || 'Unknown';
  };

  const tabs = [
    { id: 'field_check', label: 'Field Check', icon: QrCode },
    { id: 'staff_zones', label: 'Staff & Zones', icon: Users },
    { id: 'compliance_map', label: 'Compliance Map', icon: Map },
    { id: 'groups', label: 'Groups Registry', icon: Building2 },
    { id: 'penalties', label: 'Penalties', icon: AlertCircle },
    { id: 'inspections', label: 'Inspections', icon: FileText },
  ];

  const saccoStages = (saccoId) => stages.filter(s => s.county_id === countyId);

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Enforcement</h1>
      <p className="text-sm text-muted-foreground mb-5">Field checks, compliance, and staff management</p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-emerald-600 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : tab === 'field_check' ? (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-heading font-bold mb-3">Search Rider or Vehicle</h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter plate number..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <button onClick={handleSearch} className="bg-emerald-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold">Search</button>
            </div>
            {searchResult && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-heading font-bold">{searchResult.plate_number}</p>
                    <p className="text-xs text-muted-foreground">{searchResult.make} · {searchResult.color}</p>
                    <p className="text-xs text-muted-foreground mt-1">Permit: <span className="font-semibold">{permits.some(p => p.vehicle_id === searchResult.id) ? 'Active' : 'None'}</span></p>
                  </div>
                  <button onClick={() => issuePenalty(searchResult.id)} className="bg-destructive text-destructive-foreground rounded-lg px-4 py-2 text-xs font-semibold">Issue Penalty</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : tab === 'staff_zones' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
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
                      <option value="constituency">Constituency</option>
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
              const sStages = saccoStages(sacco.id);
              // Resolve SACCO member rider IDs for accurate bike filtering
              const sBikes = vehicles.filter(v => v.county_id === countyId && saccoMemberRiders[sacco.id]?.has(v.rider_id));
              const compliant = sBikes.filter(b => permits.some(p => p.vehicle_id === b.id)).length;
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
                      {sStages.map(stage => {
                        const stBikes = vehicles.filter(v => v.stage_id === stage.id);
                        const stCompliant = stBikes.filter(b => permits.some(p => p.vehicle_id === b.id)).length;
                        const stPct = stBikes.length > 0 ? Math.round((stCompliant / stBikes.length) * 100) : 0;
                        const nonCompliant = stBikes.filter(b => !permits.some(p => p.vehicle_id === b.id));
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
                                  <button onClick={() => notifyNonCompliant(stage.id)} className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-1 mb-1">
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
      ) : tab === 'groups' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Official</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Members</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">{g.name}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize hidden md:table-cell">{g.type}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{g.official_name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{g.member_count || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${g.status === 'active' ? 'bg-success/10 text-success' : g.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{g.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {g.status === 'active' && (
                      <button onClick={() => flagGroup(g.id, 'County enforcement flag')} className="flex items-center gap-1 text-xs font-semibold text-destructive bg-destructive/10 rounded-lg px-2 py-1">
                        <Flag className="w-3 h-3" /> Flag
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {groups.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No groups in this county</p>}
        </div>
      ) : tab === 'penalties' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Issued</th>
              </tr>
            </thead>
            <tbody>
              {penalties.map(p => (
                <tr key={p.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-semibold">{formatKES(p.amount_cents)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.reason}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${p.status === 'paid' ? 'bg-success/10 text-success' : p.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{p.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(p.issued_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {penalties.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No penalties issued</p>}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Result</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map(i => (
                <tr key={i.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${i.result === 'compliant' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{i.result}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{i.notes || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDateTime(i.inspected_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {inspections.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No inspections recorded</p>}
        </div>
      )}
    </div>
  );
}
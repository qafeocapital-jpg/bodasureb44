import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDate, formatKESShort } from '@/lib/format';
import { Users, Bike, Building2, Map, Search, Download, Loader2, BadgeCheck, Landmark, AlertCircle, FileBarChart, Settings } from 'lucide-react';
import UserProfileDrawer from '@/components/admin/UserProfileDrawer';

export function CountyPeople() {
  const { user } = useAuth();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [activeTab, setActiveTab] = useState('riders');
  const [riders, setRiders] = useState([]);
  const [owners, setOwners] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [saccos, setSaccos] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    load();
  }, [countyId]);

  async function load() {
    setLoading(true);
    try {
      const [riderUsers, vehicles, groupMembers, stageList] = await Promise.all([
        base44.entities.User.filter({ county_id: countyId, staff_type: 'none' }, '-created_date'),
        base44.entities.Vehicle.filter({ county_id: countyId }),
        base44.entities.GroupMember.filter({}),
        base44.entities.Stage.filter({ county_id: countyId }),
      ]);

      // Riders
      setRiders(riderUsers);
      setVehicles(vehicles);

      // Owners (vehicles with is_owner_rider: false)
      const ownerIds = [...new Set(vehicles.filter(v => !v.is_owner_rider).map(v => v.owner_id).filter(Boolean))];
      const ownerUsers = await Promise.all(
        ownerIds.map(id => base44.entities.User.get(id).catch(() => null))
      );
      setOwners(ownerUsers.filter(Boolean));

      // SACCOs in county
      const groups = await base44.entities.Group.filter({ county_id: countyId, type: 'sacco' });
      const saccoWithMembers = await Promise.all(
        groups.map(async g => {
          const members = await base44.entities.GroupMember.filter({ group_id: g.id });
          const officials = members.filter(m => ['chairperson', 'treasurer', 'secretary'].includes(m.role));
          const officialUsers = await Promise.all(
            officials.map(o => base44.entities.User.get(o.user_id).catch(() => null))
          );
          return { ...g, officials: officialUsers.filter(Boolean) };
        })
      );
      setSaccos(saccoWithMembers);

      // Stages in county with leaders
      const stagesWithLeaders = await Promise.all(
        stageList.map(async s => {
          const leader = s.leader_id ? await base44.entities.User.get(s.leader_id).catch(() => null) : null;
          return { ...s, leader };
        })
      );
      setStages(stagesWithLeaders);
    } catch (e) {
      console.error('Failed to load county data:', e);
    }
    setLoading(false);
  }

  async function handleUserClick(u) {
    setSelectedUser(u);
    setDrawerOpen(true);
    try {
      const wallets = await base44.entities.Wallet.filter({ user_id: u.id, entity_type: 'personal' });
      const wallet = wallets[0] || null;
      let snapshot = null;
      if (wallet) {
        const snaps = await base44.entities.WalletSnapshot.filter({ wallet_id: wallet.id });
        snapshot = snaps[0] || null;
      }
      setSelectedWallet(wallet);
      setSelectedSnapshot(snapshot);
    } catch (e) {}
  }

  function filterBySearch(list, searchKey) {
    if (!search.trim()) return list;
    return list.filter(item =>
      (item.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.phone?.includes(search) ||
        item.name?.toLowerCase().includes(search.toLowerCase()))
    );
  }

  const ridersFiltered = filterBySearch(riders, 'riders');
  const ownersFiltered = filterBySearch(owners, 'owners');
  const saccosFiltered = filterBySearch(saccos, 'saccos');
  const stagesFiltered = filterBySearch(stages, 'stages');

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold">County People</h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage all entities within your county</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {[
          { id: 'riders', label: 'Riders', icon: Users, count: ridersFiltered.length },
          { id: 'owners', label: 'Owners', icon: Bike, count: ownersFiltered.length },
          { id: 'saccos', label: 'SACCOs', icon: Building2, count: saccosFiltered.length },
          { id: 'stages', label: 'Stages', icon: Map, count: stagesFiltered.length },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 -mb-[1px] whitespace-nowrap ${
                activeTab === tab.id ? 'text-[#ff5a1f] border-[#ff5a1f]' : 'text-muted-foreground border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-center py-10 text-muted-foreground">Loading...</p>
      ) : (
        <>
          {/* Riders Tab */}
          {activeTab === 'riders' && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">National ID</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {ridersFiltered.map(r => (
                    <tr key={r.id} onClick={() => handleUserClick(r)} className="border-t border-border hover:bg-accent/50 cursor-pointer">
                      <td className="px-4 py-3 font-medium text-[#ff5a1f]">{r.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell text-xs">{r.national_id || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{formatDate(r.created_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ridersFiltered.length === 0 && <p className="text-center py-8 text-muted-foreground">No riders found</p>}
            </div>
          )}

          {/* Owners Tab */}
          {activeTab === 'owners' && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bikes Owned</th>
                  </tr>
                </thead>
                <tbody>
                  {ownersFiltered.map(o => {
                    const bikesOwned = vehicles.filter(v => v.owner_id === o.id && !v.is_owner_rider).length;
                    return (
                      <tr key={o.id} onClick={() => handleUserClick(o)} className="border-t border-border hover:bg-accent/50 cursor-pointer">
                        <td className="px-4 py-3 font-medium text-[#ff5a1f]">{o.full_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{o.phone}</td>
                        <td className="px-4 py-3 text-muted-foreground">{bikesOwned}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {ownersFiltered.length === 0 && <p className="text-center py-8 text-muted-foreground">No owners found</p>}
            </div>
          )}

          {/* SACCOs Tab */}
          {activeTab === 'saccos' && (
            <div className="space-y-3">
              {saccosFiltered.map(sacco => (
                <div key={sacco.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-[#ff5a1f]">{sacco.name}</h3>
                      <p className="text-xs text-muted-foreground">{sacco.member_count} members</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${sacco.status === 'active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      {sacco.status}
                    </span>
                  </div>
                  {sacco.officials && sacco.officials.length > 0 && (
                    <div className="text-xs space-y-1 pt-3 border-t border-border">
                      {sacco.officials.map(official => (
                        <p key={official.id} className="text-muted-foreground">
                          <span className="font-semibold">{official.full_name}</span> · {official.phone}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {saccosFiltered.length === 0 && <p className="text-center py-8 text-muted-foreground">No SACCOs found</p>}
            </div>
          )}

          {/* Stages Tab */}
          {activeTab === 'stages' && (
            <div className="space-y-3">
              {stagesFiltered.map(stage => (
                <div key={stage.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-[#ff5a1f]">{stage.name}</h3>
                      <p className="text-xs text-muted-foreground">{stage.member_count} members</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${stage.application_status === 'approved' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      {stage.application_status}
                    </span>
                  </div>
                  {stage.leader && (
                    <div className="text-xs pt-3 border-t border-border">
                      <p className="text-muted-foreground">
                        <span className="font-semibold">Leader:</span> {stage.leader.full_name} · {stage.leader.phone}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {stagesFiltered.length === 0 && <p className="text-center py-8 text-muted-foreground">No stages found</p>}
            </div>
          )}
        </>
      )}

      <UserProfileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        user={selectedUser}
        wallet={selectedWallet}
        snapshot={selectedSnapshot}
        onLinked={load}
      />
    </div>
  );
}

export function CountyReports() {
  const { user } = useAuth();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState({ riders: 0, verifiedRiders: 0, vehicles: 0, approvedBikes: 0, permits: 0, activePermits: 0, revenue: 0, penalties: 0, openPenalties: 0 });

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const vehicleFilter = countyId ? { county_id: countyId } : {};
      const userFilter = countyId ? { county_id: countyId, staff_type: 'none' } : { staff_type: 'none' };
      const permitFilter = countyId ? { county_id: countyId } : {};
      const penaltyFilter = countyId ? { county_id: countyId } : {};

      const [riders, vehicles, permits, penalties] = await Promise.all([
        base44.entities.User.filter(userFilter),
        base44.entities.Vehicle.filter(vehicleFilter),
        base44.entities.Permit.filter(permitFilter, '-created_date', 200),
        base44.entities.Penalty.filter(penaltyFilter, '-created_date', 100),
      ]);

      const now = new Date();
      const activePermits = permits.filter(p => p.status === 'active' && (!p.end_date || new Date(p.end_date) > now));

      setData({
        riders: riders.length,
        verifiedRiders: riders.filter(r => r.account_state === 'VERIFIED').length,
        vehicles: vehicles.length,
        approvedBikes: vehicles.filter(v => v.status === 'approved').length,
        permits: permits.length,
        activePermits: activePermits.length,
        revenue: activePermits.reduce((s, p) => s + (p.amount_paid_cents || 0), 0),
        penalties: penalties.length,
        openPenalties: penalties.filter(p => p.status === 'pending').length,
      });
    } catch (e) { console.error('Reports load error:', e); }
    setLoading(false);
  }

  function exportCSV() {
    setExporting(true);
    const rows = [
      ['Metric', 'Value'],
      ['Total Riders', data.riders],
      ['Verified Riders', data.verifiedRiders],
      ['Total Vehicles', data.vehicles],
      ['Approved Bikes', data.approvedBikes],
      ['Total Permits', data.permits],
      ['Active Permits', data.activePermits],
      ['Revenue (KES)', (data.revenue / 100).toFixed(2)],
      ['Total Penalties', data.penalties],
      ['Open Penalties', data.openPenalties],
      ['Report Date', formatDate(new Date().toISOString())],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `county-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 500);
  }

  const reportCards = [
    { label: 'Total Riders', value: data.riders, sub: `${data.verifiedRiders} verified`, icon: Users },
    { label: 'Approved Bikes', value: data.approvedBikes, sub: `${data.vehicles} total registered`, icon: BadgeCheck },
    { label: 'Active Permits', value: data.activePermits, sub: `${data.permits} total issued`, icon: BadgeCheck },
    { label: 'Revenue (Active)', value: formatKESShort(data.revenue), sub: 'From active permits', icon: Landmark },
    { label: 'Open Penalties', value: data.openPenalties, sub: `${data.penalties} total issued`, icon: AlertCircle },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileBarChart className="w-6 h-6 text-[#ff5a1f]" />
            <h1 className="text-2xl font-heading font-bold">Reports</h1>
          </div>
          <p className="text-sm text-muted-foreground">County-wide summary and exportable reports</p>
        </div>
        <button onClick={exportCSV} disabled={exporting || loading} className="flex items-center gap-1 bg-[#ff5a1f] text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {reportCards.map(card => (
              <div key={card.label} className="bg-card border border-border rounded-xl p-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 text-[#ff5a1f] mb-3">
                  <card.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-heading font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-heading font-bold mb-3">Report Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Compliance Rate</span>
                <span className="font-semibold">{data.approvedBikes > 0 ? Math.round((data.activePermits / data.approvedBikes) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Verification Rate</span>
                <span className="font-semibold">{data.riders > 0 ? Math.round((data.verifiedRiders / data.riders) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Avg Revenue per Active Permit</span>
                <span className="font-semibold">{data.activePermits > 0 ? formatKESShort(data.revenue / data.activePermits) : 'KES 0'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Report Generated</span>
                <span className="font-semibold">{formatDate(new Date().toISOString())}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CountySettings() {
  const { user } = useAuth();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [county, setCounty] = useState(null);
  const [feeSchedules, setFeeSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      if (countyId) {
        const countyData = await base44.entities.County.get(countyId).catch(() => null);
        if (countyData) setCounty(countyData);
      }
      const schedules = await base44.entities.FeeSchedule.filter(countyId ? { county_id: countyId, is_active: true } : { is_active: true });
      setFeeSchedules(schedules);
    } catch (e) { console.error('Settings load error:', e); }
    setLoading(false);
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <Settings className="w-6 h-6 text-[#ff5a1f]" />
        <h1 className="text-2xl font-heading font-bold">Settings</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">County configuration and fee schedules</p>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : (
        <div className="space-y-5">
          {county && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-heading font-bold mb-3">County Profile</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">County Name</p>
                  <p className="font-semibold">{county.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${county.status === 'live' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{county.status || 'pending'}</span>
                </div>
                {county.code && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">County Code</p>
                    <p className="font-semibold">{county.code}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-heading font-bold mb-3">Active Fee Schedules</h2>
            {feeSchedules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No fee schedules configured</p>
            ) : (
              <div className="space-y-2">
                {feeSchedules.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-semibold capitalize">{s.permit_type}</p>
                      <p className="text-xs text-muted-foreground">Grace period: {s.grace_period_days || 7} days</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatKESShort(s.amount_cents)}</p>
                      {s.penalty_amount_cents > 0 && <p className="text-xs text-red-600">Penalty: {formatKESShort(s.penalty_amount_cents)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-heading font-bold mb-3">Need Help?</h2>
            <p className="text-sm text-muted-foreground">To update county profile, fee schedules, or add sub-counties and wards, contact BodaSure support.</p>
          </div>
        </div>
      )}
    </div>
  );
}
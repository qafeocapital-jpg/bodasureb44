import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDate } from '@/lib/format';
import { Users, Bike, Building2, Map, Search, Download, Loader2 } from 'lucide-react';
import UserProfileDrawer from '@/components/admin/UserProfileDrawer';

export function CountyPeople() {
  const { user } = useAuth();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [activeTab, setActiveTab] = useState('riders');
  const [riders, setRiders] = useState([]);
  const [owners, setOwners] = useState([]);
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
                activeTab === tab.id ? 'text-emerald-600 border-emerald-600' : 'text-muted-foreground border-transparent'
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
                      <td className="px-4 py-3 font-medium text-emerald-600">{r.full_name}</td>
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
                    const bikesOwned = riders.reduce((count, r) => {
                      const userBikes = riders.length > 0 ? 1 : 0; // Simplified for demo
                      return count;
                    }, 0);
                    return (
                      <tr key={o.id} onClick={() => handleUserClick(o)} className="border-t border-border hover:bg-accent/50 cursor-pointer">
                        <td className="px-4 py-3 font-medium text-emerald-600">{o.full_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{o.phone}</td>
                        <td className="px-4 py-3 text-muted-foreground">—</td>
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
                      <h3 className="font-bold text-emerald-600">{sacco.name}</h3>
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
                      <h3 className="font-bold text-emerald-600">{stage.name}</h3>
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
  return <div className="p-6 text-center text-muted-foreground">Reports page under construction</div>;
}

export function CountySettings() {
  return <div className="p-6 text-center text-muted-foreground">Settings page under construction</div>;
}
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDateTime } from '@/lib/format';
import { ScrollText, Search, Filter } from 'lucide-react';

const ACTION_LABELS = {
  permit_issued: { label: 'Permit Issued', color: 'bg-green-50 text-green-600' },
  permit_issued_manual: { label: 'Manual Permit', color: 'bg-green-50 text-green-600' },
  vehicle_approved: { label: 'Vehicle Approved', color: 'bg-blue-50 text-blue-600' },
  vehicle_rejected: { label: 'Vehicle Rejected', color: 'bg-red-50 text-red-600' },
  kyc_approved: { label: 'KYC Approved', color: 'bg-green-50 text-green-600' },
  kyc_rejected: { label: 'KYC Rejected', color: 'bg-red-50 text-red-600' },
  account_state_transition: { label: 'State Transition', color: 'bg-orange-50 text-[#ff5a1f]' },
  penalty_issued: { label: 'Penalty Issued', color: 'bg-red-50 text-red-600' },
  stage_created: { label: 'Stage Created', color: 'bg-purple-50 text-purple-600' },
  stage_updated: { label: 'Stage Updated', color: 'bg-purple-50 text-purple-600' },
  stage_leader_approved: { label: 'Leader Approved', color: 'bg-green-50 text-green-600' },
  stage_leader_rejected: { label: 'Leader Rejected', color: 'bg-red-50 text-red-600' },
};

export default function CountyAudit() {
  const { user } = useAuth();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [riderMap, setRiderMap] = useState({});

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch county users to scope audit logs
      const countyUsers = countyId
        ? await base44.entities.User.filter({ county_id: countyId }, '-created_date', 200)
        : await base44.entities.User.filter({ staff_type: 'none' }, '-created_date', 200);
      const countyUserIds = new Set(countyUsers.map(u => u.id));
      setRiderMap(Object.fromEntries(countyUsers.map(u => [u.id, u.full_name || u.email])));

      const data = await base44.entities.AuditLog.filter({}, '-created_date', 200);
      const scoped = countyId
        ? data.filter(l => !l.user_id || countyUserIds.has(l.user_id) || l.description?.includes(countyId))
        : data;
      setLogs(scoped);
    } catch (e) { console.error('Audit load error:', e); }
    setLoading(false);
  }

  useEffect(() => {
    let result = logs;
    if (actionFilter !== 'all') result = result.filter(l => l.action === actionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        (l.description?.toLowerCase().includes(q)) ||
        (riderMap[l.user_id]?.toLowerCase().includes(q)) ||
        (l.action?.toLowerCase().includes(q))
      );
    }
    setFiltered(result);
  }, [logs, search, actionFilter, riderMap]);

  const actionOptions = ['all', ...new Set(logs.map(l => l.action))];

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <ScrollText className="w-6 h-6 text-[#ff5a1f]" />
        <h1 className="text-2xl font-heading font-bold">Audit Log</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Complete trail of all county portal actions</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by description, user, or action..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 rounded-xl border border-input bg-background text-sm font-medium"
          >
            {actionOptions.map(a => <option key={a} value={a}>{a === 'all' ? 'All Actions' : (ACTION_LABELS[a]?.label || a)}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Entity</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => {
                const config = ACTION_LABELS[log.action];
                return (
                  <tr key={log.id} className="border-t border-border hover:bg-accent/50">
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${config?.color || 'bg-muted text-muted-foreground'}`}>
                        {config?.label || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{riderMap[log.user_id] || 'System'}</td>
                    <td className="px-4 py-3 font-medium max-w-xs truncate">{log.description || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{log.entity_type || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{formatDateTime(log.created_date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No audit entries found</p>}
        </div>
      )}
    </div>
  );
}
import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDateTime } from '@/lib/format';
import { ScrollText, Search, ChevronDown, ChevronRight, User } from 'lucide-react';

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.AuditLog.filter({}, '-created_date', 100);
      setLogs(data);
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Extract unique actions for the filter dropdown
  const uniqueActions = [...new Set(logs.map(l => l.action))].sort();

  const filtered = logs.filter(l => {
    const matchesSearch = !searchQuery ||
      (l.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.entity_type || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === 'all' || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const actionColor = (action) => {
    if (action.includes('created')) return 'bg-success/10 text-success';
    if (action.includes('updated') || action.includes('marked')) return 'bg-blue-100 text-blue-700';
    if (action.includes('deleted') || action.includes('rejected') || action.includes('penalty')) return 'bg-destructive/10 text-destructive';
    if (action.includes('approved')) return 'bg-emerald-100 text-emerald-700';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <ScrollText className="w-6 h-6 text-orange-600" />
        <h1 className="text-2xl font-heading font-bold">Audit Log</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Full audit trail of all platform actions</p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by description, action, or entity..."
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading audit logs...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <ScrollText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No audit log entries found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => (
            <div key={log.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
              >
                {expandedId === log.id ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${actionColor(log.action)}`}>
                      {log.action}
                    </span>
                    {log.entity_type && (
                      <span className="text-xs text-muted-foreground">{log.entity_type}</span>
                    )}
                  </div>
                  <p className="text-sm mt-1 truncate">{log.description || 'No description'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">{formatDateTime(log.created_date)}</p>
                </div>
              </button>
              {expandedId === log.id && (
                <div className="px-4 pb-4 pt-1 border-t border-border space-y-2">
                  {log.user_id && (
                    <div className="flex items-center gap-2 text-xs">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">User:</span>
                      <span className="font-mono">{log.user_id}</span>
                    </div>
                  )}
                  {log.entity_id && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Entity ID:</span>
                      <span className="font-mono ml-2">{log.entity_id}</span>
                    </div>
                  )}
                  {log.old_values && (
                    <div className="text-xs">
                      <p className="text-muted-foreground mb-1">Old Values:</p>
                      <pre className="bg-muted rounded-lg p-2 overflow-auto text-xs font-mono">{JSON.stringify(log.old_values, null, 2)}</pre>
                    </div>
                  )}
                  {log.new_values && (
                    <div className="text-xs">
                      <p className="text-muted-foreground mb-1">New Values:</p>
                      <pre className="bg-muted rounded-lg p-2 overflow-auto text-xs font-mono">{JSON.stringify(log.new_values, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
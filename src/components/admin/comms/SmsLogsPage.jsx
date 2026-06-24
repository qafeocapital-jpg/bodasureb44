import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDateTime, formatDate } from '@/lib/format';
import { Loader2 } from 'lucide-react';

const STATUS_COLORS = {
  queued: 'bg-gray-500/10 text-gray-700 border-gray-500/30',
  sent: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  delivered: 'bg-success/10 text-success border-success/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
};

export default function SmsLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEventType, setFilterEventType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    load();
  }, [filterStatus, filterEventType, startDate, endDate]);

  async function load() {
    setLoading(true);
    try {
      let query = {};
      if (filterStatus) query.status = filterStatus;
      if (filterEventType) query.event_type = filterEventType;
      if (startDate) query.created_date = { $gte: startDate };
      if (endDate) {
        if (!query.created_date) query.created_date = {};
        query.created_date.$lte = endDate;
      }

      const l = await base44.entities.SmsLog.filter(query, '-created_date', 200);
      setLogs(l);
    } catch (e) {}
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Event Type</label>
          <select
            value={filterEventType}
            onChange={e => setFilterEventType(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="">All Events</option>
            <option value="otp">OTP</option>
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="permit_receipt">Permit</option>
            <option value="p2p_send">P2P Send</option>
            <option value="kyc_approved">KYC Approved</option>
            <option value="kyc_rejected">KYC Rejected</option>
            <option value="bulk">Bulk</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
          />
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <p className="text-center py-10 text-muted-foreground">Loading...</p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Template</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">AT Message ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 text-xs">{formatDateTime(log.created_date)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.recipient_phone}</td>
                  <td className="px-4 py-3 text-xs capitalize">{log.event_type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{log.template_key}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded border ${STATUS_COLORS[log.status] || 'bg-gray-500/10'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground hidden lg:table-cell truncate">{log.at_message_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No logs found</p>}
        </div>
      )}
    </div>
  );
}
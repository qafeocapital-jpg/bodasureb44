import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDateTime, formatDate } from '@/lib/format';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_COLORS = {
  queued: 'bg-gray-500/10 text-gray-700 border-gray-500/30',
  sent: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  delivered: 'bg-success/10 text-success border-success/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
};

export default function SmsLogsPage({ countyScope = null }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEventType, setFilterEventType] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());

  useEffect(() => {
    load();
  }, [filterStatus, filterEventType, filterPhone, startDate, endDate, countyScope]);

  async function load() {
    setLoading(true);
    setExpandedIds(new Set());
    try {
      let query = {};
      if (filterStatus) query.status = filterStatus;
      if (filterEventType) query.event_type = filterEventType;
      if (startDate) query.created_date = { $gte: startDate };
      if (endDate) {
        if (!query.created_date) query.created_date = {};
        query.created_date.$lte = endDate;
      }

      let l = await base44.entities.SmsLog.filter(query, '-created_date', 500);
      
      // If county scoped, filter by user county
      if (countyScope) {
        const scopedUserIds = new Set();
        const countyUsers = await base44.entities.User.filter({ county_id: countyScope });
        countyUsers.forEach(u => scopedUserIds.add(u.id));
        l = l.filter(log => log.user_id && scopedUserIds.has(log.user_id));
      }
      
      // Filter by phone number if provided
      if (filterPhone) {
        l = l.filter(log => log.recipient_phone?.includes(filterPhone));
      }
      
      setLogs(l.slice(0, 200));
    } catch (e) {}
    setLoading(false);
  }

  function toggleExpanded(logId) {
    const newSet = new Set(expandedIds);
    if (newSet.has(logId)) {
      newSet.delete(logId);
    } else {
      newSet.add(logId);
    }
    setExpandedIds(newSet);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
         <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
         <input
           type="text"
           value={filterPhone}
           onChange={e => setFilterPhone(e.target.value)}
           placeholder="e.g., 254705..."
           className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
         />
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
               <th className="text-center px-4 py-3 font-medium text-muted-foreground w-8"></th>
             </tr>
            </thead>
            <tbody>
             {logs.map(log => (
               <React.Fragment key={log.id}>
                 <tr className="border-t border-border hover:bg-accent/50 cursor-pointer" onClick={() => toggleExpanded(log.id)}>
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
                   <td className="px-4 py-3 text-center">
                     {expandedIds.has(log.id) ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                   </td>
                 </tr>
                 {expandedIds.has(log.id) && (
                   <tr className="border-t border-orange-400/30 bg-muted/50">
                     <td colSpan="7" className="px-4 py-4">
                       <div className="space-y-3 border-l-2 border-orange-400 pl-4">
                         <div>
                           <p className="text-xs font-medium text-muted-foreground mb-2">Message</p>
                           <pre className="bg-background rounded p-3 text-xs font-mono whitespace-pre-wrap break-words">{log.message_body}</pre>
                         </div>
                         {log.failure_reason && (
                           <div>
                             <p className="text-xs font-medium text-destructive mb-1">Failure Reason</p>
                             <p className="text-xs text-destructive">{log.failure_reason}</p>
                           </div>
                         )}
                         <div className="grid grid-cols-2 gap-3">
                           <div>
                             <p className="text-xs font-medium text-muted-foreground mb-1">AT Message ID</p>
                             <p className="text-xs font-mono text-foreground break-all">{log.at_message_id || '—'}</p>
                           </div>
                           {log.metadata_json && (
                             <div>
                               <p className="text-xs font-medium text-muted-foreground mb-1">Metadata</p>
                               <pre className="text-xs font-mono text-muted-foreground bg-background rounded p-2 max-h-20 overflow-y-auto">{JSON.stringify(JSON.parse(log.metadata_json), null, 2)}</pre>
                             </div>
                           )}
                         </div>
                       </div>
                     </td>
                   </tr>
                 )}
               </React.Fragment>
             ))}
            </tbody>
          </table>
          {logs.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No logs found</p>}
        </div>
      )}
    </div>
  );
}
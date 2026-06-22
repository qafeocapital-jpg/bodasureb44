import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatKES, formatDateTime } from '@/lib/format';
import { FileBarChart, Download, Loader2, FileSpreadsheet } from 'lucide-react';

export default function AdminReports() {
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [data, setData] = useState([]);
  const [error, setError] = useState('');

  const reportConfigs = [
    { id: 'transactions', name: 'Transaction Report', desc: 'All transactions across the platform', entity: 'Transaction', sort: '-created_date', limit: 200 },
    { id: 'settlements', name: 'Settlement Report', desc: 'All settlements by entity type', entity: 'Settlement', sort: '-created_date', limit: 200 },
    { id: 'riders', name: 'Rider Report', desc: 'All registered riders', entity: 'User', sort: '-created_date', limit: 200, filter: { staff_type: 'none' } },
    { id: 'lipisha', name: 'Lipisha Report', desc: 'Fare collection transactions', entity: 'Transaction', sort: '-created_date', limit: 200, filter: { type: 'lipisha' } },
    { id: 'permits', name: 'Permit Report', desc: 'All permits issued', entity: 'Permit', sort: '-created_date', limit: 200 },
    { id: 'audit', name: 'Audit Log', desc: 'Full audit trail of all actions', entity: 'AuditLog', sort: '-created_date', limit: 200 },
  ];

  async function runReport(config) {
    setActiveReport(config);
    setLoading(true);
    setError('');
    setData([]);
    try {
      const result = config.filter
        ? await base44.entities[config.entity].filter(config.filter, config.sort, config.limit)
        : await base44.entities[config.entity].list(config.sort, config.limit);
      setData(result);
    } catch (e) {
      setError(e.message || 'Failed to load report data');
    }
    setLoading(false);
  }

  function exportCSV() {
    if (data.length === 0) return;

    // Get all unique keys across records
    const keys = new Set();
    data.forEach(row => Object.keys(row).forEach(k => keys.add(k)));
    const headers = [...keys];

    // Build CSV rows
    const csvLines = [headers.join(',')];
    data.forEach(row => {
      const values = headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
      });
      csvLines.push(values.join(','));
    });

    // Download
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeReport.id}_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Column rendering per report type
  const renderRow = (row) => {
    if (activeReport.id === 'transactions') {
      return (
        <tr key={row.id} className="border-t border-border hover:bg-accent/50">
          <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(row.created_date)}</td>
          <td className="px-3 py-2 text-xs font-semibold">{row.type}</td>
          <td className="px-3 py-2 text-xs">{formatKES(row.amount_cents)}</td>
          <td className="px-3 py-2 text-xs"><span className={`rounded-full px-2 py-0.5 font-semibold ${row.status === 'completed' ? 'bg-success/10 text-success' : row.status === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>{row.status}</span></td>
          <td className="px-3 py-2 text-xs text-muted-foreground font-mono truncate max-w-[120px]">{row.reference || '—'}</td>
        </tr>
      );
    }
    if (activeReport.id === 'settlements') {
      return (
        <tr key={row.id} className="border-t border-border hover:bg-accent/50">
          <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(row.created_date)}</td>
          <td className="px-3 py-2 text-xs font-semibold capitalize">{row.entity_type}</td>
          <td className="px-3 py-2 text-xs">{formatKES(row.amount_cents)}</td>
          <td className="px-3 py-2 text-xs"><span className={`rounded-full px-2 py-0.5 font-semibold ${row.status === 'processed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{row.status}</span></td>
        </tr>
      );
    }
    if (activeReport.id === 'riders') {
      return (
        <tr key={row.id} className="border-t border-border hover:bg-accent/50">
          <td className="px-3 py-2 text-xs font-medium">{row.full_name || '—'}</td>
          <td className="px-3 py-2 text-xs text-muted-foreground">{row.email}</td>
          <td className="px-3 py-2 text-xs text-muted-foreground">{row.phone || '—'}</td>
          <td className="px-3 py-2 text-xs">{row.national_id || '—'}</td>
          <td className="px-3 py-2 text-xs"><span className="capitalize">{row.kyc_status || 'none'}</span></td>
        </tr>
      );
    }
    if (activeReport.id === 'lipisha') {
      return (
        <tr key={row.id} className="border-t border-border hover:bg-accent/50">
          <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(row.created_date)}</td>
          <td className="px-3 py-2 text-xs">{formatKES(row.amount_cents)}</td>
          <td className="px-3 py-2 text-xs"><span className={`rounded-full px-2 py-0.5 font-semibold ${row.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{row.status}</span></td>
          <td className="px-3 py-2 text-xs text-muted-foreground">{row.counterparty_phone || '—'}</td>
        </tr>
      );
    }
    if (activeReport.id === 'permits') {
      return (
        <tr key={row.id} className="border-t border-border hover:bg-accent/50">
          <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(row.start_date)}</td>
          <td className="px-3 py-2 text-xs font-semibold capitalize">{row.billing_cycle}</td>
          <td className="px-3 py-2 text-xs">{formatKES(row.amount_paid_cents)}</td>
          <td className="px-3 py-2 text-xs"><span className={`rounded-full px-2 py-0.5 font-semibold ${row.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{row.status}</span></td>
        </tr>
      );
    }
    if (activeReport.id === 'audit') {
      return (
        <tr key={row.id} className="border-t border-border hover:bg-accent/50">
          <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(row.created_date)}</td>
          <td className="px-3 py-2 text-xs font-semibold">{row.action}</td>
          <td className="px-3 py-2 text-xs text-muted-foreground">{row.entity_type || '—'}</td>
          <td className="px-3 py-2 text-xs max-w-[300px] truncate">{row.description || '—'}</td>
        </tr>
      );
    }
    return null;
  };

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Reports</h1>
      <p className="text-sm text-muted-foreground mb-5">View and export platform-wide data</p>

      {/* Report selector grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {reportConfigs.map(r => (
          <button
            key={r.id}
            onClick={() => runReport(r)}
            className={`bg-card border rounded-xl p-4 text-left transition-colors ${activeReport?.id === r.id ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-border hover:bg-accent'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <FileBarChart className={`w-6 h-6 ${activeReport?.id === r.id ? 'text-orange-600' : 'text-muted-foreground'}`} />
              <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">{r.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Report results */}
      {activeReport && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="text-sm font-heading font-bold">{activeReport.name}</p>
              <p className="text-xs text-muted-foreground">{data.length} records {loading && '(loading...)'}</p>
            </div>
            {data.length > 0 && !loading && (
              <button onClick={exportCSV} className="flex items-center gap-1.5 bg-orange-500 text-white rounded-lg px-3 py-2 text-xs font-semibold hover:bg-orange-600 transition-colors">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            )}
          </div>

          {error ? (
            <p className="text-sm text-destructive text-center py-8">{error}</p>
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    {activeReport.id === 'transactions' && <>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Type</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Amount</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Reference</th>
                    </>}
                    {activeReport.id === 'settlements' && <>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Entity</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Amount</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Status</th>
                    </>}
                    {activeReport.id === 'riders' && <>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Name</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Email</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Phone</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">National ID</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">KYC</th>
                    </>}
                    {activeReport.id === 'lipisha' && <>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Amount</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Payer</th>
                    </>}
                    {activeReport.id === 'permits' && <>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Start Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Cycle</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Amount</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Status</th>
                    </>}
                    {activeReport.id === 'audit' && <>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Action</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Entity</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Description</th>
                    </>}
                  </tr>
                </thead>
                <tbody>
                  {data.map(renderRow)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
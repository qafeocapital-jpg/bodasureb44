import { FileBarChart, Download } from 'lucide-react';

export default function AdminReports() {
  const reports = [
    { name: 'Transaction Report', desc: 'All transactions across the platform' },
    { name: 'Settlement Report', desc: 'All settlements by entity type' },
    { name: 'Rider Report', desc: 'All registered riders' },
    { name: 'Lipisha Report', desc: 'Fare collection transactions' },
    { name: 'Permit Report', desc: 'All permits issued' },
    { name: 'Audit Log', desc: 'Full audit trail of all actions' },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Reports</h1>
      <p className="text-sm text-muted-foreground mb-5">Download platform-wide reports</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <button key={r.name} className="bg-card border border-border rounded-xl p-4 text-left hover:bg-accent transition-colors">
            <div className="flex items-center justify-between mb-2">
              <FileBarChart className="w-6 h-6 text-orange-600" />
              <Download className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">{r.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
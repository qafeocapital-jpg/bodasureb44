import { base44 } from '@/api/base44Client';
import { Users, FileBarChart, Settings as SettingsIcon, Bell } from 'lucide-react';

export function CountyPeople() {
  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">People</h1>
      <p className="text-sm text-muted-foreground mb-5">Manage staff and communications</p>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3"><Users className="w-5 h-5 text-emerald-600" /><h2 className="font-heading font-bold">County Staff</h2></div>
          <p className="text-sm text-muted-foreground text-center py-8">No staff members added</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3"><Bell className="w-5 h-5 text-emerald-600" /><h2 className="font-heading font-bold">Announcements</h2></div>
          <p className="text-sm text-muted-foreground text-center py-8">No announcements published</p>
        </div>
      </div>
    </div>
  );
}

export function CountyReports() {
  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Reports</h1>
      <p className="text-sm text-muted-foreground mb-5">Export data and view audit trail</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {['Transaction Report', 'Settlement Report', 'Rider Report', 'Lipisha Report', 'Permit Report', 'Audit Log'].map(r => (
          <button key={r} className="bg-card border border-border rounded-xl p-4 text-left hover:bg-accent transition-colors">
            <FileBarChart className="w-6 h-6 text-emerald-600 mb-2" />
            <p className="text-sm font-medium">{r}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Export as CSV</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function CountySettings() {
  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-5">County profile and configuration</p>
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4"><SettingsIcon className="w-5 h-5 text-emerald-600" /><h2 className="font-heading font-bold">County Profile</h2></div>
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground">County Name</label><input className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="Nairobi" /></div>
          <div><label className="text-xs text-muted-foreground">County Code</label><input className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="47" /></div>
        </div>
      </div>
    </div>
  );
}
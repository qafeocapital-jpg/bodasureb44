import { UserPlus, History } from 'lucide-react';

export default function AgentDashboard() {
  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold">Field Agent Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Recruit riders and track your invites</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-5 h-5 text-orange-600" />
            <h2 className="font-heading font-bold">Invite Rider</h2>
          </div>
          <p className="text-sm text-muted-foreground">Enter a rider's phone number to send them an invite to join BodaSure.</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-5 h-5 text-blue-600" />
            <h2 className="font-heading font-bold">Invite History</h2>
          </div>
          <p className="text-sm text-muted-foreground">No invites sent yet.</p>
        </div>
      </div>
    </div>
  );
}
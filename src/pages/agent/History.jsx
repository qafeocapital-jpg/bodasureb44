import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDateTime } from '@/lib/format';
import { History } from 'lucide-react';

export default function AgentHistory() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const a = await base44.entities.Announcement.filter({ audience: 'all' }, '-created_date', 20);
        setInvites(a);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Invite History</h1>
      <p className="text-sm text-muted-foreground mb-5">Track all past invites</p>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : invites.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <History className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No invites sent yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invites.map(i => (
            <div key={i.id} className="bg-card border border-border rounded-xl px-4 py-3">
              <p className="text-sm font-medium">{i.title}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(i.created_date)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
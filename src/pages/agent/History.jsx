import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDateTime } from '@/lib/format';
import { History, CheckCircle2, UserPlus } from 'lucide-react';

export default function AgentHistory() {
  const { user } = useAuth();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const all = await base44.entities.Announcement.filter({ audience: 'all' }, '-created_date', 50);
        const inviteRecords = all.filter(a => a.title && a.title.startsWith('Invite:') && a.created_by_id === user.id);
        setInvites(inviteRecords);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Invite History</h1>
      <p className="text-sm text-muted-foreground mb-5">Track all past invites</p>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : invites.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <History className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No invites sent yet. Head to Invite Rider to get started.</p>
          <Link to="/agent/invite" className="inline-flex items-center gap-1 bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
            <UserPlus className="w-4 h-4" /> Invite Rider
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {invites.map(i => {
            const name = i.title.replace('Invite:', '').trim().split('(')[0].trim();
            const phoneMatch = i.body && i.body.match(/\(?(\d[\d\s-]+)\)?/);
            const phone = phoneMatch ? phoneMatch[1].trim() : null;
            return (
              <div key={i.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{name || 'Unknown'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {phone && <span className="text-xs text-muted-foreground">{phone}</span>}
                    <span className="text-xs text-muted-foreground">{formatDateTime(i.created_date)}</span>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-success bg-success/10 rounded-full px-2.5 py-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
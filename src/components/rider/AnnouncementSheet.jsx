import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDate } from '@/lib/format';
import { X, Megaphone, Bell } from 'lucide-react';

export default function AnnouncementSheet({ open, onClose, onRead }) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const all = await base44.entities.Announcement.filter({ status: 'published' }, '-created_date', 50);
        const riderCounty = user?.county_id;
        const visible = all.filter(a => {
          const audienceOk = a.audience === 'all' || a.audience === 'riders';
          const countyOk = !a.county_id || a.county_id === riderCounty;
          return audienceOk && countyOk;
        });
        setAnnouncements(visible);
        if (onRead && visible.length > 0) {
          onRead(visible[0].id);
        }
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [open, user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[512px] bg-card rounded-t-3xl p-6 pb-8 animate-slide-up max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg">Announcements</h3>
              <p className="text-xs text-muted-foreground">{announcements.length} {announcements.length === 1 ? 'update' : 'updates'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-3 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-10">
            <Megaphone className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No announcements yet</p>
            <p className="text-xs text-muted-foreground mt-1">Check back later for updates from BodaSure.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a, i) => (
              <div key={a.id} className={`rounded-xl p-4 ${i === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-accent border border-border'}`}>
                <div className="flex items-start gap-2 mb-1">
                  <Megaphone className={`w-4 h-4 flex-shrink-0 mt-0.5 ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-heading font-bold text-sm">{a.title}</p>
                </div>
                <p className="text-sm text-muted-foreground ml-6 mb-2">{a.body}</p>
                <p className="text-[10px] text-muted-foreground ml-6">{formatDate(a.created_date)}</p>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} className="w-full mt-4 text-center text-sm text-muted-foreground py-2">
          Close
        </button>
      </div>
    </div>
  );
}
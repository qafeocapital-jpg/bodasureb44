import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import AnnouncementSheet from './AnnouncementSheet';

export default function RiderHeader() {
  const { user } = useAuth();
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [lastReadId, setLastReadId] = useState(null);

  useEffect(() => {
    if (!user) return;
    try {
      const stored = localStorage.getItem(`announcements_read_${user.id}`);
      if (stored) setLastReadId(stored);
    } catch (e) {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    async function checkUnread() {
      try {
        const all = await base44.entities.Announcement.filter({ status: 'published' }, '-created_date', 1);
        if (all.length > 0) {
          const latestId = all[0].id;
          const audienceOk = all[0].audience === 'all' || all[0].audience === 'riders';
          const countyOk = !all[0].county_id || all[0].county_id === user?.county_id;
          if (audienceOk && countyOk && latestId !== lastReadId) {
            setHasUnread(true);
          } else {
            setHasUnread(false);
          }
        }
      } catch (e) {}
    }
    checkUnread();
  }, [user, lastReadId]);

  function handleRead(latestId) {
    if (latestId) {
      setLastReadId(latestId);
      setHasUnread(false);
      try {
        localStorage.setItem(`announcements_read_${user?.id}`, latestId);
      } catch (e) {}
    }
  }

  return (
    <>
      <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[512px] z-50 bg-white/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-heading font-extrabold text-lg">B</span>
            </div>
            <h1 className="font-heading font-bold text-lg tracking-tight">
              <span className="text-foreground">Boda</span>
              <span className="text-primary">Sure</span>
            </h1>
          </Link>
          <button onClick={() => setShowAnnouncements(true)} className="relative p-2 rounded-lg hover:bg-accent transition-colors">
            <Bell className="w-5 h-5 text-foreground" />
            {hasUnread && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />}
          </button>
        </div>
      </header>
      <AnnouncementSheet
        open={showAnnouncements}
        onClose={() => setShowAnnouncements(false)}
        onRead={handleRead}
      />
    </>
  );
}
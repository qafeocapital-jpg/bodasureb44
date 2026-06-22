import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/format';
import { auditLog } from '@/lib/audit';
import { Megaphone, Plus, Archive, Send, Pencil } from 'lucide-react';

const AUDIENCES = [
  { value: 'all', label: 'All Users' },
  { value: 'riders', label: 'Riders' },
  { value: 'county_staff', label: 'County Staff' },
  { value: 'sacco_staff', label: 'SACCO Staff' },
];

export default function AdminAnnouncements() {
  const { toast } = useToast();
  const [tab, setTab] = useState('published');
  const [announcements, setAnnouncements] = useState([]);
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', body: '', audience: 'all', county_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        base44.entities.Announcement.filter({}, '-created_date', 100),
        base44.entities.County.filter({}),
      ]);
      setAnnouncements(a);
      setCounties(c);
    } catch (e) {}
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ title: '', body: '', audience: 'all', county_id: '' });
    setShowModal(true);
  }

  function openEdit(a) {
    setEditing(a);
    setForm({ title: a.title || '', body: a.body || '', audience: a.audience || 'all', county_id: a.county_id || '' });
    setShowModal(true);
  }

  async function save(publish) {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      const u = await base44.auth.me();
      const status = publish ? 'published' : 'draft';
      if (editing) {
        await base44.entities.Announcement.update(editing.id, {
          title: form.title.trim(),
          body: form.body.trim(),
          audience: form.audience,
          county_id: form.county_id || null,
          status,
        });
        await auditLog({ userId: u.id, action: 'announcement_updated', entityType: 'Announcement', entityId: editing.id, description: `Announcement "${form.title.trim()}" updated (${status})` });
      } else {
        const created = await base44.entities.Announcement.create({
          title: form.title.trim(),
          body: form.body.trim(),
          audience: form.audience,
          county_id: form.county_id || null,
          status,
        });
        await auditLog({ userId: u.id, action: 'announcement_created', entityType: 'Announcement', entityId: created.id, description: `Announcement "${form.title.trim()}" created (${status})` });
      }
      setShowModal(false);
      toast({ title: publish ? 'Announcement Published' : 'Draft Saved', description: form.title.trim() });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  async function archive(a) {
    try {
      const u = await base44.auth.me();
      await base44.entities.Announcement.update(a.id, { status: 'archived' });
      await auditLog({ userId: u.id, action: 'announcement_archived', entityType: 'Announcement', entityId: a.id, description: `Announcement "${a.title}" archived` });
      toast({ title: 'Archived', description: a.title });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  }

  async function publish(a) {
    try {
      const u = await base44.auth.me();
      await base44.entities.Announcement.update(a.id, { status: 'published' });
      await auditLog({ userId: u.id, action: 'announcement_published', entityType: 'Announcement', entityId: a.id, description: `Announcement "${a.title}" published` });
      toast({ title: 'Published', description: a.title });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  }

  const countyName = (id) => counties.find(c => c.id === id)?.name || 'Platform-wide';
  const audienceLabel = (val) => AUDIENCES.find(a => a.value === val)?.label || val;

  const published = announcements.filter(a => a.status === 'published');
  const drafts = announcements.filter(a => a.status === 'draft');
  const list = tab === 'published' ? published : drafts;

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-heading font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Broadcast messages to riders and staff</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1 bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('published')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'published' ? 'bg-orange-500 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
          <Megaphone className="w-4 h-4" /> Published ({published.length})
        </button>
        <button onClick={() => setTab('drafts')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'drafts' ? 'bg-orange-500 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
          Drafts ({drafts.length})
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : list.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Megaphone className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{tab === 'published' ? 'No published announcements' : 'No draft announcements'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(a => (
            <div key={a.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-bold text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(a.created_date)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-primary/10 text-primary">{audienceLabel(a.audience)}</span>
                  <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-accent text-muted-foreground">{countyName(a.county_id)}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{a.body}</p>
              <div className="flex gap-2">
                {tab === 'published' ? (
                  <button onClick={() => archive(a)} className="flex items-center gap-1 bg-destructive/10 text-destructive rounded-lg px-3 py-1.5 text-xs font-semibold">
                    <Archive className="w-3.5 h-3.5" /> Archive
                  </button>
                ) : (
                  <>
                    <button onClick={() => openEdit(a)} className="flex items-center gap-1 bg-muted text-foreground rounded-lg px-3 py-1.5 text-xs font-semibold">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => publish(a)} className="flex items-center gap-1 bg-orange-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">
                      <Send className="w-3.5 h-3.5" /> Publish
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="font-heading font-bold text-lg mb-4">{editing ? 'Edit Announcement' : 'New Announcement'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Title</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Body</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={4} placeholder="Write your announcement..." className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-y" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Audience</label>
                <select value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                  {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">County (optional — leave blank for platform-wide)</label>
                <select value={form.county_id} onChange={e => setForm(f => ({ ...f, county_id: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                  <option value="">Platform-wide</option>
                  {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={() => save(false)} disabled={!form.title.trim() || !form.body.trim() || saving} className="flex-1 bg-muted text-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button onClick={() => save(true)} disabled={!form.title.trim() || !form.body.trim() || saving} className="!flex-[1.5] bg-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Publishing...' : 'Publish Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
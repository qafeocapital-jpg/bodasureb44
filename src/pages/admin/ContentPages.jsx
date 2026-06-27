import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { getLegalPage, sectionsToHtml, LEGAL_PAGES } from '@/lib/legalContent';
import { FileText, Save, Loader2, ShieldAlert } from 'lucide-react';

const TABS = LEGAL_PAGES.map(p => ({ slug: p.slug, label: p.title }));

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'blockquote'],
  ],
};

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ContentPages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeSlug, setActiveSlug] = useState('privacy');
  const [html, setHtml] = useState('');
  const [dbRecord, setDbRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = user?.roles?.includes('super_admin') || user?.role === 'super_admin';

  useEffect(() => {
    if (!isSuperAdmin) return;
    setLoading(true);
    setDbRecord(null);
    const page = getLegalPage(activeSlug);
    base44.entities.LegalContent.filter({ slug: activeSlug })
      .then(records => {
        if (records.length > 0 && records[0].html_body) {
          setDbRecord(records[0]);
          setHtml(records[0].html_body);
        } else if (page) {
          setHtml(sectionsToHtml(page));
        }
      })
      .catch(() => {
        if (page) setHtml(sectionsToHtml(page));
      })
      .finally(() => setLoading(false));
  }, [activeSlug, isSuperAdmin]);

  async function handleSave() {
    const page = getLegalPage(activeSlug);
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (dbRecord) {
        const updated = await base44.entities.LegalContent.update(dbRecord.id, {
          title: page.title,
          html_body: html,
          updated_by_id: user.id,
          updated_at: now,
        });
        setDbRecord(updated);
      } else {
        const created = await base44.entities.LegalContent.create({
          slug: activeSlug,
          title: page.title,
          html_body: html,
          updated_by_id: user.id,
          updated_at: now,
        });
        setDbRecord(created);
      }
      toast({ title: 'Saved', description: `${page.title} has been updated and is now live.` });
    } catch (err) {
      toast({ title: 'Error saving', description: err.message || 'Something went wrong.', variant: 'destructive' });
    }
    setSaving(false);
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7 text-destructive" />
        </div>
        <h1 className="text-xl font-heading font-bold mb-1">Access Denied</h1>
        <p className="text-sm text-muted-foreground">Only Super Admins can manage static page content.</p>
      </div>
    );
  }

  const lastSaved = formatDate(dbRecord?.updated_at);

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Static Pages</h1>
            <p className="text-sm text-muted-foreground">Edit legal and policy pages — changes go live instantly.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.slug}
            onClick={() => setActiveSlug(tab.slug)}
            className={`px-4 py-3 font-semibold text-sm border-b-2 -mb-[1px] whitespace-nowrap transition-colors ${
              activeSlug === tab.slug ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Editor card */}
      <div className="bg-card border border-border rounded-xl p-4">
        {loading ? (
          <div className="flex items-center justify-center h-[500px]">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">
                {lastSaved ? `Last saved: ${lastSaved}` : 'No saved version yet — editing default content'}
              </span>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
            <ReactQuill
              theme="snow"
              value={html}
              onChange={setHtml}
              modules={QUILL_MODULES}
              style={{ minHeight: '500px' }}
            />
          </>
        )}
      </div>
    </div>
  );
}
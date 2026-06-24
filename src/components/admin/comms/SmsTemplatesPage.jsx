import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Edit2, Power } from 'lucide-react';
import SmsTemplateDrawer from '@/components/admin/comms/SmsTemplateDrawer';

export default function SmsTemplatesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const t = await base44.entities.SmsTemplate.filter({});
      setTemplates(t);
    } catch (e) {}
    setLoading(false);
  }

  async function handleToggleActive(template) {
    try {
      await base44.entities.SmsTemplate.update(template.id, { is_active: !template.is_active });
      toast({ title: template.is_active ? 'Template disabled' : 'Template enabled' });
      load();
    } catch (e) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  }

  function handleEdit(template) {
    setSelectedTemplate(template);
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-center py-10 text-muted-foreground">Loading...</p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Template Key</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Message</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 font-mono text-xs">{t.template_key}</td>
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-xs capitalize">{t.event_type}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-xs">{t.body}</td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(t)}
                      className="p-2 rounded-lg hover:bg-muted"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-primary" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(t)}
                      className={`p-2 rounded-lg ${t.is_active ? 'bg-success/10' : 'bg-destructive/10'}`}
                      title={t.is_active ? 'Disable' : 'Enable'}
                    >
                      <Power className={`w-4 h-4 ${t.is_active ? 'text-success' : 'text-destructive'}`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {templates.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No templates found</p>}
        </div>
      )}

      <SmsTemplateDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        template={selectedTemplate}
        onSaved={() => { setSelectedTemplate(null); load(); }}
      />
    </div>
  );
}
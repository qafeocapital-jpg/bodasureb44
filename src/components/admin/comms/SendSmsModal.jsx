import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Send, X } from 'lucide-react';

export default function SendSmsModal({ open, onOpenChange, userPhone, userName, onSuccess }) {
  const { toast } = useToast();
  const [mode, setMode] = useState('freeform'); // 'freeform' or 'template'
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [message, setMessage] = useState('');
  const [variables, setVariables] = useState({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      loadTemplates();
      setMessage('');
      setSelectedTemplate('');
      setVariables({});
    }
  }, [open]);

  async function loadTemplates() {
    try {
      const items = await base44.entities.SmsTemplate.filter({ is_active: true });
      setTemplates(items);
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  }

  function extractVariables(text) {
    const regex = /\{(\w+)\}/g;
    const matches = [...text.matchAll(regex)];
    const vars = {};
    matches.forEach(m => {
      if (!vars[m[1]]) vars[m[1]] = '';
    });
    return vars;
  }

  function substituteVariables(text, vars) {
    return text.replace(/\{(\w+)\}/g, (match, key) => vars[key] || '');
  }

  function handleTemplateChange(templateId) {
    setSelectedTemplate(templateId);
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) {
      setMessage(tpl.body);
      setVariables(extractVariables(tpl.body));
    }
  }

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const finalMessage = mode === 'template' ? substituteVariables(message, variables) : message;
      const templateKey = mode === 'template' && selectedTemplate 
        ? templates.find(t => t.id === selectedTemplate)?.template_key 
        : null;
      await base44.functions.invoke('sendSms', {
        phone: userPhone,
        message: finalMessage,
        templateKey,
        eventType: 'bulk',
      });
      toast({ title: 'SMS sent', description: `Message delivered to ${userPhone}` });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (e) {
      toast({ title: 'Failed to send', description: e.message, variant: 'destructive' });
    }
    setSending(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative bg-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-lg">Send SMS to {userName}</h3>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded-lg hover:bg-accent">
            <X className="w-5 h-5" />
          </button>
        </div>

        <Tabs value={mode} onValueChange={setMode} className="mb-4">
          <TabsList className="w-full">
            <TabsTrigger value="freeform" className="flex-1">Free-form</TabsTrigger>
            <TabsTrigger value="template" className="flex-1">Template</TabsTrigger>
          </TabsList>

          <TabsContent value="freeform" className="space-y-3 mt-4">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none h-32"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{message.length} characters</span>
              <span className={message.length > 160 ? 'text-warning' : 'text-muted-foreground'}>
                {Math.ceil(message.length / 160)} SMS part(s)
              </span>
            </div>
          </TabsContent>

          <TabsContent value="template" className="space-y-3 mt-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Select Template</label>
              <select
                value={selectedTemplate}
                onChange={e => handleTemplateChange(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
              >
                <option value="">— Choose a template —</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {Object.keys(variables).length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Fill Variables</label>
                <div className="space-y-2">
                  {Object.keys(variables).map(key => (
                    <input
                      key={key}
                      type="text"
                      placeholder={key}
                      value={variables[key]}
                      onChange={e => setVariables({ ...variables, [key]: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs"
                    />
                  ))}
                </div>
              </div>
            )}

            {message && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Preview</label>
                <p className="text-sm p-3 bg-muted/50 rounded-lg">{substituteVariables(message, variables)}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-4 border-t border-border">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-accent"
            disabled={sending}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
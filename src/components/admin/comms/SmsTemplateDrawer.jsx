import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, AlertCircle } from 'lucide-react';

export default function SmsTemplateDrawer({ open, onOpenChange, template, onSaved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) setBody(template.body);
    else setBody('');
  }, [template, open]);

  async function handleSave() {
    if (!body.trim()) {
      toast({ title: 'Message cannot be empty', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await base44.entities.SmsTemplate.update(template.id, {
        body,
        last_edited_by: user.id,
        updated_at: new Date().toISOString(),
      });
      toast({ title: 'Template saved' });
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
    setSaving(false);
  }

  const charCount = body.length;
  const isSmsLength = charCount <= 160;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>{template?.name || 'Edit Template'}</SheetTitle>
        </SheetHeader>

        {template && (
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Message</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full mt-2 px-3 py-2 rounded-xl border border-input bg-background text-sm font-mono resize-none"
                rows={6}
              />
              <div className="mt-2 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <p className={charCount > 160 ? 'text-destructive font-semibold' : isSmsLength ? 'text-success' : 'text-warning'}>
                    {charCount} / 160 characters
                  </p>
                  {charCount > 160 && <p className="text-[10px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> This will be sent as multiple SMS parts</p>}
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Available Variables</p>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                {template.event_type === 'otp' && <span className="bg-primary/10 text-primary px-2 py-1 rounded">{'{code}'}</span>}
                {['deposit', 'withdrawal', 'permit_receipt', 'p2p_send'].includes(template.event_type) && (
                  <>
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">{'{amount}'}</span>
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">{'{ref}'}</span>
                  </>
                )}
                {template.event_type === 'deposit' && <span className="bg-primary/10 text-primary px-2 py-1 rounded">{'{balance}'}</span>}
                {template.event_type === 'permit_receipt' && (
                  <>
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">{'{plate}'}</span>
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">{'{date}'}</span>
                  </>
                )}
                {template.event_type === 'p2p_send' && <span className="bg-primary/10 text-primary px-2 py-1 rounded">{'{recipient}'}</span>}
                {template.event_type === 'kyc_rejected' && <span className="bg-primary/10 text-primary px-2 py-1 rounded">{'{reason}'}</span>}
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4 flex gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
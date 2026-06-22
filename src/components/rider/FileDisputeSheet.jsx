import { useState } from 'react';
import { X, AlertCircle, Loader2, Send } from 'lucide-react';

const categories = [
  { value: 'failed_transaction', label: 'Failed Transaction', desc: 'Money was deducted but the service was not delivered' },
  { value: 'wrong_amount', label: 'Wrong Amount', desc: 'The transaction amount was incorrect' },
  { value: 'unauthorized', label: 'Unauthorized Transaction', desc: 'I did not authorize this transaction' },
  { value: 'duplicate_charge', label: 'Duplicate Charge', desc: 'I was charged more than once for the same service' },
  { value: 'service_issue', label: 'Service Issue', desc: 'The service I paid for was not delivered' },
  { value: 'other', label: 'Other', desc: 'Something else went wrong' },
];

export default function FileDisputeSheet({ open, onClose, onSubmit, transaction, preselectedCategory }) {
  const [category, setCategory] = useState(preselectedCategory || '');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  function handleClose() {
    setCategory('');
    setReason('');
    setDescription('');
    setError('');
    onClose();
  }

  async function handleSubmit() {
    if (!category) {
      setError('Please select a category.');
      return;
    }
    if (!reason.trim()) {
      setError('Please describe your issue.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        category,
        reason: reason.trim(),
        description: description.trim(),
      });
      setCategory('');
      setReason('');
      setDescription('');
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to file dispute. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-[512px] bg-card rounded-t-3xl p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg">File a Dispute</h3>
              <p className="text-xs text-muted-foreground">We'll review your case within 48 hours</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-accent">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {transaction && (
          <div className="bg-accent rounded-xl p-3 mb-4">
            <p className="text-xs text-muted-foreground">Transaction</p>
            <p className="text-sm font-mono font-medium">{transaction.reference}</p>
            <p className="text-sm font-semibold mt-0.5">KES {(transaction.amount_cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <div className="space-y-2 mt-2">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  disabled={!!preselectedCategory}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-colors disabled:opacity-50 ${category === cat.value ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <p className="text-sm font-semibold">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">{cat.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Issue Summary *</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Brief title for your dispute"
              maxLength={100}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Detailed Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide as much detail as possible about what happened..."
              rows={4}
              maxLength={500}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{description.length}/500</p>
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting || !category || !reason.trim()}
            className="w-full flex items-center justify-center gap-2 bg-destructive text-destructive-foreground rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Submitting...' : 'File Dispute'}
          </button>
          <button onClick={handleClose} className="w-full text-center text-sm text-muted-foreground py-2">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
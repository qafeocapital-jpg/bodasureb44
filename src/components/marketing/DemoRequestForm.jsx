import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function DemoRequestForm() {
  const [form, setForm] = useState({ name: '', county: '', role: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const update = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setError(''); };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await base44.functions.invoke('submitDemoRequest', form);
      if (res.data?.error) throw new Error(res.data.error);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again or email help@bodasure.com');
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="bg-card border border-success/30 rounded-2xl p-8 max-w-lg mx-auto text-center">
        <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
        <h3 className="font-heading font-bold text-lg mb-1">Request Received!</h3>
        <p className="text-sm text-muted-foreground">
          Thank you, {form.name || 'there'}. Our team will call you back within 48 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 max-w-lg mx-auto text-left space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Full Name *</label>
          <input
            type="text" required value={form.name} onChange={update('name')}
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">County *</label>
          <input
            type="text" required value={form.county} onChange={update('county')}
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Role / Title *</label>
          <input
            type="text" required value={form.role} onChange={update('role')}
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Phone *</label>
          <input
            type="tel" required value={form.phone} onChange={update('phone')}
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email *</label>
        <input
          type="email" required value={form.email} onChange={update('email')}
          className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <button
        type="submit" disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-60 hover:opacity-90 transition-opacity"
      >
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Request Callback'}
      </button>
      {error && (
        <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/5 border border-destructive/20 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}
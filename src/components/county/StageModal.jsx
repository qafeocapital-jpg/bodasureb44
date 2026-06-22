import { useState, useEffect } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';

export default function StageModal({ open, onClose, onSubmit, editingStage, countyId }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(editingStage?.name || '');
      setDescription(editingStage?.description || '');
      setError('');
    }
  }, [open, editingStage]);

  if (!open) return null;

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Stage name is required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), description: description.trim() });
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to save stage.');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setName('');
    setDescription('');
    setError('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-heading font-bold text-lg">{editingStage ? 'Edit Stage' : 'Add Stage'}</h3>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-accent">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Stage Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. CBD Stage (Ronald Ngala)"
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Location details, landmarks, etc."
              rows={3}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button onClick={handleClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={saving || !name.trim()}
              className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingStage ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';

/**
 * Inline markup input for TariffManager.
 * Holds local state to avoid firing API calls on every keystroke.
 * Saves on blur.
 */
export default function MarkupInput({ tier, onSave, saving }) {
  const isPct = tier.bodasure_markup_type === 'percentage';
  const storedValue = isPct ? tier.bodasure_markup_pct : tier.bodasure_markup_kes;
  const [localValue, setLocalValue] = useState(storedValue);
  const [dirty, setDirty] = useState(false);

  function handleChange(e) {
    setLocalValue(parseFloat(e.target.value) || 0);
    setDirty(true);
  }

  function handleBlur() {
    if (dirty) {
      const field = isPct ? 'bodasure_markup_pct' : 'bodasure_markup_kes';
      onSave({ [field]: localValue });
      setDirty(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        step="0.5"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={saving}
        className="w-20 px-2 py-1 rounded border border-input bg-background text-xs disabled:opacity-50"
      />
      <span className="text-[10px] text-muted-foreground">{isPct ? '%' : 'KES'}</span>
      {dirty && <span className="text-[10px] text-warning">unsaved</span>}
    </div>
  );
}
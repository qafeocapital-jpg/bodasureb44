import { useRef } from 'react';

/**
 * Two-field split plate number input.
 * Field 1: 4 uppercase letters. Field 2: 4 alphanumeric chars.
 * Auto-advances focus from prefix to suffix on completion.
 * Calls onChange with the combined uppercase string (no space).
 */
export default function PlateInput({ value = '', onChange, error }) {
  const suffixRef = useRef(null);
  const prefix = value.slice(0, 4);
  const suffix = value.slice(4, 8);

  function handlePrefixChange(e) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    onChange(val + suffix);
    if (val.length === 4) suffixRef.current?.focus();
  }

  function handleSuffixChange(e) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    onChange(prefix + val);
  }

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">Plate Number</label>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="text"
          value={prefix}
          onChange={handlePrefixChange}
          placeholder="KMCF"
          maxLength={4}
          autoCapitalize="characters"
          autoCorrect="off"
          className="flex-1 px-3 py-2.5 rounded-xl border bg-background text-sm uppercase text-center font-semibold tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ borderColor: error ? 'hsl(var(--destructive))' : 'hsl(var(--input))' }}
        />
        <span className="text-muted-foreground font-bold text-lg">—</span>
        <input
          ref={suffixRef}
          type="text"
          value={suffix}
          onChange={handleSuffixChange}
          placeholder="123A"
          maxLength={4}
          autoCapitalize="characters"
          autoCorrect="off"
          className="flex-1 px-3 py-2.5 rounded-xl border bg-background text-sm uppercase text-center font-semibold tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ borderColor: error ? 'hsl(var(--destructive))' : 'hsl(var(--input))' }}
        />
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
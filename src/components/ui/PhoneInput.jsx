import { useState, useEffect } from 'react';
import { normalizePhone, localFromE164, isValidKenyanPhone } from '@/lib/phone';

/**
 * Controlled phone input with fixed 🇰🇪 +254 prefix.
 * Parent owns the E.164 value string.
 *
 * Props:
 *  - value: E.164 string (e.g. '254712345678')
 *  - onChange: (e164String) => void
 *  - label?: string
 *  - error?: string (external error, e.g. uniqueness)
 *  - disabled?: boolean
 *  - onBlur?: () => void
 */
export default function PhoneInput({ value, onChange, label = 'Phone Number', error, disabled, onBlur }) {
  const [local, setLocal] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setLocal(localFromE164(value || ''));
  }, [value]);

  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '');
    setLocal(digits);
    const e164 = normalizePhone(digits.startsWith('0') ? digits : digits);
    onChange(e164 || digits);
  }

  function handleBlur() {
    setTouched(true);
    if (onBlur) onBlur();
  }

  const isInvalid = touched && local.length > 0 && !isValidKenyanPhone(local.startsWith('0') ? local : local);
  const showError = error || (isInvalid ? 'Enter a valid Kenyan phone number (07XX or 01XX)' : null);

  return (
    <div>
      {label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
      <div className={`flex mt-1 rounded-xl border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary ${disabled ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-1.5 px-3 bg-muted border-r border-input text-sm font-medium text-muted-foreground">
          <span className="text-base">🇰🇪</span>
          <span>+254</span>
        </div>
        <input
          type="tel"
          inputMode="numeric"
          value={local}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder="07XX XXX XXX"
          className="flex-1 px-3 py-2.5 bg-background text-sm focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      {showError && <p className="text-xs text-destructive mt-1">{showError}</p>}
    </div>
  );
}
/**
 * Kenyan phone number utilities.
 * All stored phone numbers are E.164: '254XXXXXXXXX' (12 digits).
 */

/**
 * Normalise any Kenyan phone input to E.164 format.
 * Handles: 07XX, 7XX, +2547XX, 2547XX, 01XX, 1XX.
 * @param {string} raw
 * @returns {string|null} '254XXXXXXXXX' or null if invalid
 */
export function normalizePhone(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let digits = raw.replace(/\D/g, '');

  // Strip leading 0 (07XX → 7XX)
  if (digits.startsWith('0')) digits = digits.slice(1);

  // Strip country code 254
  if (digits.startsWith('254')) digits = digits.slice(3);

  // Now we should have a 9-digit number starting with 7 or 1
  if (digits.length !== 9) return null;
  if (!digits.startsWith('7') && !digits.startsWith('1')) return null;

  return '254' + digits;
}

/**
 * Check if a raw phone input is a valid Kenyan number.
 * @param {string} raw
 * @returns {boolean}
 */
export function isValidKenyanPhone(raw) {
  return normalizePhone(raw) !== null;
}

/**
 * Format an E.164 phone for display: '+254 7XX XXX XXX'.
 * @param {string} e164
 * @returns {string}
 */
export function formatPhoneDisplay(e164) {
  if (!e164 || typeof e164 !== 'string') return '';
  // If already a display string, return as-is
  if (e164.includes(' ')) return e164;
  const normalised = e164.startsWith('254') ? e164 : normalizePhone(e164);
  if (!normalised || normalised.length !== 12) return e164;
  const local = normalised.slice(3); // 9 digits
  return `+254 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/**
 * Extract the local part (9 digits) from an E.164 string for display in input.
 * @param {string} e164
 * @returns {string} e.g. '712345678' or ''
 */
export function localFromE164(e164) {
  if (!e164) return '';
  const digits = e164.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits.slice(3);
  return digits;
}
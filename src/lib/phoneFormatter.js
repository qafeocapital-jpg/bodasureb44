/**
 * Sanitize and format phone numbers for Africa's Talking API
 * Africa's Talking requires: +[country_code][number] or [country_code][number]
 * Kenya country code: 254
 */

export function sanitizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return null;

  // Remove all non-digit characters except leading +
  let sanitized = phone.trim();
  const hasPlus = sanitized.startsWith('+');
  sanitized = sanitized.replace(/\D/g, '');

  // If empty after sanitization, return null
  if (!sanitized) return null;

  // Handle Kenyan numbers
  if (sanitized.startsWith('254')) {
    // Already has country code, just add + if missing
    return `+${sanitized}`;
  } else if (sanitized.startsWith('0')) {
    // Kenyan number starting with 0 (e.g., 0705378676)
    // Convert to 254705378676 then add +
    sanitized = '254' + sanitized.substring(1);
    return `+${sanitized}`;
  } else {
    // Assume it's a number without country code, add Kenya's
    return `+254${sanitized}`;
  }
}

/**
 * Validate a phone number after sanitization
 * Kenya numbers should be 12 digits when formatted: +254[9-digit-number]
 */
export function isValidPhoneNumber(formattedPhone) {
  if (!formattedPhone) return false;
  // Should be +254xxxxxxxxx (12 chars total)
  return /^\+254\d{9}$/.test(formattedPhone);
}

export default { sanitizePhoneNumber, isValidPhoneNumber };
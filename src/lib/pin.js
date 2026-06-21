/**
 * PIN utility for wallet transaction verification.
 * Uses a simple salted hash (suitable for mock phase; replace with proper crypto before production).
 */

const SALT = 'bodasure_2024_salt';

/**
 * Hash a 4-digit PIN with a salt.
 * @param {string} pin - 4-digit PIN
 * @returns {string} hashed PIN
 */
export function hashPin(pin) {
  // Simple hash: base64 of salted PIN — replace with bcrypt/argon2 when SasaPay goes live
  let hash = 0;
  const str = SALT + pin;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return btoa(String(hash));
}

/**
 * Verify a PIN against a stored hash.
 * @param {string} pin - 4-digit PIN entered by user
 * @param {string} storedHash - stored hash from wallet record
 * @returns {boolean}
 */
export function verifyPin(pin, storedHash) {
  if (!pin || !storedHash) return false;
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) return false;
  return hashPin(pin) === storedHash;
}

/**
 * Validate PIN format (4 digits).
 * @param {string} pin
 * @returns {boolean}
 */
export function isValidPinFormat(pin) {
  return /^\d{4}$/.test(pin);
}
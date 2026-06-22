import { base44 } from '@/api/base44Client';

/**
 * PIN utility for wallet transaction verification.
 * All hashing happens server-side via backend functions (PBKDF2-SHA256).
 * The client never sees the hash or the salt.
 */

/**
 * Verify a wallet PIN via backend (secure PBKDF2 hashing).
 * @param {string} pin - 4-digit PIN entered by user
 * @param {string} walletId - Wallet ID
 * @returns {Promise<boolean>}
 */
export async function verifyPin(pin, walletId) {
  if (!pin || !walletId) return false;
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) return false;
  try {
    const res = await base44.functions.invoke('verifyWalletPin', { walletId, pin });
    return res.data?.valid === true;
  } catch (e) {
    return false;
  }
}

/**
 * Set a wallet PIN securely via backend (PBKDF2 hashing with random salt).
 * @param {string} walletId - Wallet ID
 * @param {string} pin - 4-digit PIN
 * @returns {Promise<boolean>}
 */
export async function setWalletPin(walletId, pin) {
  if (!walletId || !pin) return false;
  if (!/^\d{4}$/.test(pin)) return false;
  const res = await base44.functions.invoke('setWalletPin', { walletId, pin });
  return res.data?.success === true;
}

/**
 * Validate PIN format (4 digits).
 * @param {string} pin
 * @returns {boolean}
 */
export function isValidPinFormat(pin) {
  return /^\d{4}$/.test(pin);
}
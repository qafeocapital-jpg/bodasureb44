import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Secure PIN Verification — uses PBKDF2-SHA256 via Web Crypto API.
 *
 * Supports two hash formats:
 *   - New:   pbkdf2$<iterations>$<base64-salt>$<base64-hash>
 *   - Legacy: btoa(djb2(pin))  — backward compat for wallets activated before this upgrade
 *
 * The legacy path also upgrades the hash to PBKDF2 on successful verification
 * (transparent migration to secure hashing).
 */

async function pbkdf2Hash(pin, saltBase64, iterations) {
  const encoder = new TextEncoder();
  const saltBytes = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const bytes = new Uint8Array(derivedBits);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function generateSaltBase64() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function djb2Hash(pin) {
  const SALT = 'bodasure_2024_salt';
  let hash = 0;
  const str = SALT + pin;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return btoa(String(hash));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { walletId, pin } = body;

    if (!walletId || !pin) {
      return Response.json({ error: 'Missing walletId or pin' }, { status: 400 });
    }
    if (!/^\d{4}$/.test(pin)) {
      return Response.json({ error: 'PIN must be 4 digits' }, { status: 400 });
    }

    const wallets = await base44.asServiceRole.entities.Wallet.filter({ id: walletId });
    if (wallets.length === 0) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const wallet = wallets[0];

    // Verify wallet belongs to the authenticated user
    if (wallet.user_id !== user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!wallet.pin_hash) {
      return Response.json({ valid: false, error: 'No PIN set' });
    }

    // Brute force protection: lock after 5 failed attempts for 30 minutes
    const pinAttempts = wallet.pin_attempts || 0;
    const pinLockedUntil = wallet.pin_locked_until ? new Date(wallet.pin_locked_until) : null;
    if (pinLockedUntil && pinLockedUntil > new Date()) {
      const minsLeft = Math.ceil((pinLockedUntil - new Date()) / 60000);
      return Response.json({ valid: false, error: `Wallet locked. Try again in ${minsLeft} minute${minsLeft !== 1 ? 's' : ''}.` });
    }

    let valid = false;
    let needsUpgrade = false;

    if (wallet.pin_hash.startsWith('pbkdf2$')) {
      const parts = wallet.pin_hash.split('$');
      if (parts.length === 4) {
        const iterations = parseInt(parts[1], 10);
        const salt = parts[2];
        const storedHash = parts[3];
        const computedHash = await pbkdf2Hash(pin, salt, iterations);
        valid = computedHash === storedHash;
      }
    } else {
      // Legacy DJB2 path — verify then upgrade
      valid = djb2Hash(pin) === wallet.pin_hash;
      needsUpgrade = valid;
    }

    // Transparent migration: upgrade legacy hash to PBKDF2
    if (valid && needsUpgrade) {
      const salt = generateSaltBase64();
      const iterations = 100000;
      const hash = await pbkdf2Hash(pin, salt, iterations);
      const pinHash = `pbkdf2$${iterations}$${salt}$${hash}`;
      await base44.asServiceRole.entities.Wallet.update(wallet.id, { pin_hash: pinHash, pin_attempts: 0, pin_locked_until: null });
    }

    // Brute force tracking: increment on failure, reset on success, lock after 5 failures
    if (!valid) {
      const newAttempts = pinAttempts + 1;
      const lockAfter = 5;
      if (newAttempts >= lockAfter) {
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await base44.asServiceRole.entities.Wallet.update(wallet.id, { pin_attempts: newAttempts, pin_locked_until: lockUntil.toISOString() });
        return Response.json({ valid: false, error: 'Too many incorrect attempts. Wallet locked for 30 minutes.' });
      }
      await base44.asServiceRole.entities.Wallet.update(wallet.id, { pin_attempts: newAttempts });
      const remaining = lockAfter - newAttempts;
      return Response.json({ valid: false, error: `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` });
    }

    // Reset attempts on successful verification
    if (pinAttempts > 0) {
      await base44.asServiceRole.entities.Wallet.update(wallet.id, { pin_attempts: 0, pin_locked_until: null });
    }

    return Response.json({ valid });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
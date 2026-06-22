import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * OTP Verification — verifies a 4-digit OTP against the hashed
 * value stored on the User entity. Clears the OTP after successful
 * verification to prevent replay.
 */

async function pbkdf2Hash(input, saltBase64, iterations) {
  const encoder = new TextEncoder();
  const saltBytes = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(input),
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { otpCode } = body;

    if (!otpCode || !/^\d{4}$/.test(otpCode)) {
      return Response.json({ valid: false, error: 'Invalid OTP format' }, { status: 400 });
    }

    // Re-fetch user to get otp_hash and otp_expires_at (me() may not return custom fields)
    const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
    if (users.length === 0) {
      return Response.json({ valid: false, error: 'User not found' }, { status: 404 });
    }

    const fullUser = users[0];

    if (!fullUser.otp_hash || !fullUser.otp_expires_at) {
      return Response.json({ valid: false, error: 'No OTP requested. Please request a new code.' }, { status: 400 });
    }

    // Check expiry
    const expiresAt = new Date(fullUser.otp_expires_at);
    if (expiresAt < new Date()) {
      return Response.json({ valid: false, error: 'OTP has expired. Please request a new code.' }, { status: 400 });
    }

    // Verify OTP
    let valid = false;
    if (fullUser.otp_hash.startsWith('pbkdf2$')) {
      const parts = fullUser.otp_hash.split('$');
      if (parts.length === 4) {
        const iterations = parseInt(parts[1], 10);
        const salt = parts[2];
        const storedHash = parts[3];
        const computedHash = await pbkdf2Hash(otpCode, salt, iterations);
        valid = computedHash === storedHash;
      }
    }

    if (valid) {
      // Clear OTP after successful verification (prevents replay)
      // Also mark phone as verified for Phase 6 verification
      await base44.asServiceRole.entities.User.update(user.id, {
        otp_hash: null,
        otp_expires_at: null,
        phone_verified: true,
      });
    }

    return Response.json({ valid });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
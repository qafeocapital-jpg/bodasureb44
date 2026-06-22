import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * OTP Delivery — generates a 4-digit one-time code, stores it
 * hashed (PBKDF2) on the User entity with a 5-minute expiry,
 * and sends it via email.
 *
 * Hash format: pbkdf2$<iterations>$<base64-salt>$<base64-hash>
 */

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function generateSaltBase64() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

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

    if (!user.email) {
      return Response.json({ error: 'No email address on file' }, { status: 400 });
    }

    // Generate OTP
    const otpCode = generateOtp();
    const salt = generateSaltBase64();
    const iterations = 100000;
    const hash = await pbkdf2Hash(otpCode, salt, iterations);
    const otpHash = `pbkdf2$${iterations}$${salt}$${hash}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store hashed OTP on the user
    await base44.asServiceRole.entities.User.update(user.id, {
      otp_hash: otpHash,
      otp_expires_at: expiresAt,
    });

    // Send OTP via email
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: 'BodaSure — Your Verification Code',
        body: `<p>Hello ${user.full_name || ''},</p><p>Your BodaSure verification code is: <strong style="font-size:24px;letter-spacing:4px">${otpCode}</strong></p><p>This code expires in 5 minutes.</p><p>If you didn't request this, please ignore this email.</p>`,
      });
    } catch (emailErr) {
      return Response.json({ error: 'Failed to send OTP email: ' + emailErr.message }, { status: 500 });
    }

    return Response.json({ success: true, sentVia: 'email' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
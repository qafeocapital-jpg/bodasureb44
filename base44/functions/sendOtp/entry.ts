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

    // Store hashed OTP on the user (reset attempt counter)
    await base44.asServiceRole.entities.User.update(user.id, {
      otp_hash: otpHash,
      otp_expires_at: expiresAt,
      otp_attempts: 0,
    });

    // Send OTP via SMS
    if (!user.phone) {
      return Response.json({ error: 'No phone number on file' }, { status: 400 });
    }

    const atApiKey = Deno.env.get('AT_API_KEY');
    const atUsername = Deno.env.get('AT_USERNAME');
    if (!atApiKey || !atUsername) {
      return Response.json({ error: 'SMS not configured' }, { status: 500 });
    }

    const smsMessage = `Your BodaSure code: ${otpCode}. Valid 5 mins. Do not share.`;

    try {
      const body = new URLSearchParams();
      body.append('username', atUsername);
      body.append('to', user.phone);
      body.append('message', smsMessage);

      const response = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'apiKey': atApiKey,
        },
        body,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`AT error: ${err}`);
      }

      const atData = await response.json();
      const messageId = atData.SMSMessageData?.Recipients?.[0]?.messageId;

      // Log the SMS
      await base44.asServiceRole.entities.SmsLog.create({
        recipient_phone: user.phone,
        message_body: smsMessage,
        template_key: 'otp',
        event_type: 'otp',
        at_message_id: messageId,
        status: 'sent',
        user_id: user.id,
      });
    } catch (smsErr) {
      return Response.json({ error: 'Failed to send OTP SMS: ' + smsErr.message }, { status: 500 });
    }

    return Response.json({ success: true, sentVia: 'sms' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
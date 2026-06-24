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

function sanitizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return null;
  let sanitized = phone.trim();
  sanitized = sanitized.replace(/\D/g, '');
  if (!sanitized) return null;
  if (sanitized.startsWith('254')) return `+${sanitized}`;
  if (sanitized.startsWith('0')) return `+254${sanitized.substring(1)}`;
  return `+254${sanitized}`;
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

    const formattedPhone = sanitizePhoneNumber(user.phone);
    if (!formattedPhone) {
      return Response.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // Get Africa's Talking credentials
    function getAtCredentials() {
      const isProd = Deno.env.get('AT_ENVIRONMENT') === 'production';
      const username = isProd
        ? (Deno.env.get('AT_USERNAME_PRODUCTION') || Deno.env.get('AT_USERNAME'))
        : Deno.env.get('AT_USERNAME');
      const apiKey = isProd
        ? (Deno.env.get('AT_API_KEY_PRODUCTION') || Deno.env.get('AT_API_KEY'))
        : Deno.env.get('AT_API_KEY');
      const baseUrl = isProd 
        ? 'https://api.africastalking.com' 
        : 'https://api.sandbox.africastalking.com';
      const senderId = Deno.env.get('AT_SENDER_ID') || null;
      return { username, apiKey, baseUrl, senderId, isProd };
    }

    const { username, apiKey, baseUrl, senderId, isProd } = getAtCredentials();
    if (!apiKey || !username) {
      return Response.json({ error: 'SMS not configured' }, { status: 500 });
    }

    const smsMessage = `Your BodaSure code: ${otpCode}. Valid 5 mins. Do not share.`;

    console.log(`[sendOtp] env=${isProd ? 'production' : 'sandbox'} username=${username} baseUrl=${baseUrl} senderId=${senderId || 'default'}`);

    try {
      const body = new URLSearchParams();
      body.append('username', username);
      body.append('to', formattedPhone);
      body.append('message', smsMessage);
      if (senderId) body.append('from', senderId);

      const response = await fetch(`${baseUrl}/version1/messaging`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'apiKey': apiKey,
        },
        body,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`AT error: ${err}`);
      }

      const atData = await response.json();
      const messageId = atData.SMSMessageData?.Recipients?.[0]?.messageId;

      // Log the SMS (with formatted phone)
      await base44.asServiceRole.entities.SmsLog.create({
        recipient_phone: formattedPhone,
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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Test function to send SMS to a specific phone number
 * Used for verifying SMS delivery and logging
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone, message } = await req.json();
    if (!phone || !message) {
      return Response.json({ error: 'Missing phone or message' }, { status: 400 });
    }

    // Sanitize phone number
    function sanitizePhoneNumber(p) {
      if (!p || typeof p !== 'string') return null;
      let sanitized = p.trim();
      sanitized = sanitized.replace(/\D/g, '');
      if (!sanitized) return null;
      if (sanitized.startsWith('254')) return `+${sanitized}`;
      if (sanitized.startsWith('0')) return `+254${sanitized.substring(1)}`;
      return `+254${sanitized}`;
    }

    // Shared credential resolver
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

    const formattedPhone = sanitizePhoneNumber(phone);
    if (!formattedPhone) {
      return Response.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // Get credentials and audit log
    const { username, apiKey, baseUrl, senderId, isProd } = getAtCredentials();
    console.log(`[testSms] env=${isProd ? 'production' : 'sandbox'} username=${username} baseUrl=${baseUrl} senderId=${senderId || 'default'}`);

    // Build request body
    const body = new URLSearchParams({
      username: username,
      to: formattedPhone,
      message: message,
    });
    if (senderId) body.append('from', senderId);

    // Send SMS directly via Africa's Talking
    const response = await fetch(`${baseUrl}/version1/messaging`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'apiKey': apiKey,
      },
      body,
    });

    const data = await response.json();
    const recipients = data.SMSMessageData?.Recipients || [];
    const atMessageId = recipients[0]?.messageId || null;
    const sendStatus = recipients[0]?.status === 'Success' ? 'sent' : 'failed';
    
    console.log(`[testSms] sent to ${formattedPhone}: ${sendStatus} (AT ID: ${atMessageId})`);

    // Log the SMS
    const log = await base44.asServiceRole.entities.SmsLog.create({
      recipient_phone: formattedPhone,
      message_body: message,
      template_key: 'test_sms',
      event_type: 'bulk',
      at_message_id: atMessageId,
      status: sendStatus,
      user_id: user.id,
      metadata_json: JSON.stringify({ testMode: true }),
      failure_reason: sendStatus === 'failed' ? data.SMSMessageData?.Message : null,
    });

    // Verify it was logged
    const logs = await base44.asServiceRole.entities.SmsLog.filter(
      { recipient_phone: formattedPhone },
      '-created_date',
      5
    );

    return Response.json({
      success: true,
      sentTo: formattedPhone,
      atMessageId,
      sendStatus,
      logCreated: log.id,
      recentLogs: logs.slice(0, 3).map(l => ({
        id: l.id,
        recipient_phone: l.recipient_phone,
        event_type: l.event_type,
        status: l.status,
        created_date: l.created_date,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
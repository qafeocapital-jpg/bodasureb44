import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Send a transactional SMS via Africa's Talking.
 * Logs the message in SmsLog entity for delivery tracking.
 * Phone numbers are sanitized to +254[number] format automatically.
 */

// Phone number sanitization
function sanitizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return null;
  let sanitized = phone.trim();
  sanitized = sanitized.replace(/\D/g, '');
  if (!sanitized) return null;
  if (sanitized.startsWith('254')) return `+${sanitized}`;
  if (sanitized.startsWith('0')) return `+254${sanitized.substring(1)}`;
  return `+254${sanitized}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone, message, templateKey, eventType, metadata = {} } = await req.json();
    if (!phone || !message || !eventType) {
      return Response.json({ error: 'Missing required fields: phone, message, eventType' }, { status: 400 });
    }

    const formattedPhone = sanitizePhoneNumber(phone);
    if (!formattedPhone) {
      return Response.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // Get Africa's Talking config (sandbox or production)
    const isProd = Deno.env.get('AT_ENVIRONMENT') === 'production';
    const atUsername = isProd
      ? (Deno.env.get('AT_USERNAME_PRODUCTION') || Deno.env.get('AT_USERNAME'))
      : Deno.env.get('AT_USERNAME');
    const atApiKey = isProd
      ? (Deno.env.get('AT_API_KEY_PRODUCTION') || Deno.env.get('AT_API_KEY'))
      : Deno.env.get('AT_API_KEY');
    
    if (!atUsername || !atApiKey) {
      return Response.json({ error: 'Africa\'s Talking credentials not configured' }, { status: 500 });
    }

    const atBaseUrl = isProd 
      ? 'https://api.africastalking.com' 
      : 'https://api.sandbox.africastalking.com';

    // Send SMS via Africa's Talking
    const response = await fetch(`${atBaseUrl}/version1/messaging`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'apiKey': atApiKey,
      },
      body: new URLSearchParams({
        username: atUsername,
        to: formattedPhone,
        message: message,
      }).toString(),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Africa\'s Talking error:', data);
      return Response.json({ error: data.message || 'Failed to send SMS' }, { status: 500 });
    }

    // Extract message ID from response
    const recipients = data.SMSMessageData?.Recipients || [];
    const atMessageId = recipients[0]?.messageId || null;
    const status = recipients[0]?.status === 'Success' ? 'sent' : 'failed';

    // Log the SMS in SmsLog (with formatted phone)
    await base44.asServiceRole.entities.SmsLog.create({
      recipient_phone: formattedPhone,
      message_body: message,
      template_key: templateKey || null,
      event_type: eventType,
      at_message_id: atMessageId,
      status: status,
      user_id: user.id,
      metadata_json: JSON.stringify(metadata),
      failure_reason: status === 'failed' ? data.SMSMessageData?.Message : null,
    });

    return Response.json({
      success: true,
      messageId: atMessageId,
      status: status,
      phone: formattedPhone,
    });
  } catch (error) {
    console.error('sendSms error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
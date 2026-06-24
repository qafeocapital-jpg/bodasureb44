import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Send a transactional SMS via Africa's Talking.
 * Logs the message in SmsLog entity for delivery tracking.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone, message, templateKey, eventType, metadata = {} } = await req.json();
    if (!phone || !message || !eventType) {
      return Response.json({ error: 'Missing required fields: phone, message, eventType' }, { status: 400 });
    }

    const atUsername = Deno.env.get('AT_USERNAME');
    const atApiKey = Deno.env.get('AT_API_KEY');
    if (!atUsername || !atApiKey) {
      return Response.json({ error: 'Africa\'s Talking credentials not configured' }, { status: 500 });
    }

    // Resolve AT base URL from environment
    const atEnv = Deno.env.get('AT_ENVIRONMENT');
    const atBaseUrl = atEnv === 'sandbox' ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com';

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
        to: phone,
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

    // Log the SMS in SmsLog
    await base44.asServiceRole.entities.SmsLog.create({
      recipient_phone: phone,
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
      phone: phone,
    });
  } catch (error) {
    console.error('sendSms error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
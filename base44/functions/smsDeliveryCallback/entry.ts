import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Africa's Talking SMS Delivery Callback Handler
 * Receives delivery reports from AT and updates SmsLog status in real-time.
 * 
 * Must always return 200 OK to prevent AT from retrying excessively.
 * URL to configure in AT Dashboard: {BASE44_APP_URL}/functions/smsDeliveryCallback
 */

Deno.serve(async (req) => {
  try {
    // Parse form data from AT
    const text = await req.text();
    const params = new URLSearchParams(text);
    
    const atMessageId = params.get('id');
    const atStatus = params.get('status');
    const phoneNumber = params.get('phoneNumber');
    const failureReason = params.get('failureReason');
    const networkCode = params.get('networkCode');

    console.log(`[smsDeliveryCallback] Received: id=${atMessageId} status=${atStatus} phone=${phoneNumber}`);

    // If no message ID, return OK anyway (AT will stop retrying)
    if (!atMessageId) {
      return Response.json({ ok: true }, { status: 200 });
    }

    // Map AT status to SmsLog status
    let smsLogStatus = 'sent';
    if (atStatus === 'Success') {
      smsLogStatus = 'delivered';
    } else if (['Failed', 'Rejected', 'DeliveryFailure', 'Expired', 'AbsentSubscriber'].includes(atStatus)) {
      smsLogStatus = 'failed';
    }

    // Find and update the SmsLog record
    const base44 = createClientFromRequest(req);
    const logs = await base44.asServiceRole.entities.SmsLog.filter(
      { at_message_id: atMessageId },
      '-created_date',
      1
    );

    if (logs.length > 0) {
      const log = logs[0];
      const updateData = {
        status: smsLogStatus,
      };
      
      if (smsLogStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      } else if (smsLogStatus === 'failed') {
        updateData.failure_reason = failureReason || atStatus;
      }

      await base44.asServiceRole.entities.SmsLog.update(log.id, updateData);
      console.log(`[smsDeliveryCallback] Updated log ${log.id}: ${smsLogStatus}`);
    } else {
      console.log(`[smsDeliveryCallback] No log found for AT ID ${atMessageId}`);
    }

    // Always return 200 OK to prevent AT retries
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[smsDeliveryCallback] Error:', error.message);
    // Still return 200 to prevent AT from retrying on our errors
    return new Response('OK', { status: 200 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * SasaPay WaaS Integration — Webhook handler.
 *
 * SasaPay sends webhook callbacks when payment status changes
 * (STK success, STK failure, C2B confirmation, etc.).
 *
 * This function:
 * 1. Validates the webhook authenticity
 * 2. Finds the matching transaction by reference
 * 3. Updates the transaction status
 * 4. Updates wallet balances
 * 5. Creates a PaymentEvent for audit/idempotency
 *
 * URL: Configure in SasaPay dashboard → Webhooks
 *   https://your-app.base44.app/api/functions/sasapayWebhook
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Validate webhook (SasaPay doesn't use HMAC; verify via callback_url match)
    // In production, add IP whitelist or shared secret validation
    const webhookSecret = Deno.env.get('SASAPAY_WEBHOOK_SECRET');
    if (webhookSecret) {
      const providedSecret = new URL(req.url).searchParams.get('secret');
      if (providedSecret !== webhookSecret) {
        return Response.json({ error: 'Invalid webhook secret' }, { status: 401 });
      }
    }

    const { transaction_reference, status, amount, payer_phone } = body;

    if (!transaction_reference) {
      return Response.json({ error: 'Missing transaction_reference' }, { status: 400 });
    }

    // Find the transaction by reference
    const txns = await base44.asServiceRole.entities.Transaction.filter({ reference: transaction_reference });
    if (txns.length === 0) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const txn = txns[0];

    // Idempotency: if already completed, don't process again
    if (txn.status === 'completed') {
      return Response.json({ status: 'already_processed' });
    }

    // Update transaction status
    const newStatus = status === 'success' ? 'completed' : status === 'failed' ? 'failed' : 'pending';
    await base44.asServiceRole.entities.Transaction.update(txn.id, {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      failure_reason: newStatus === 'failed' ? (body.message || 'Payment failed') : null,
    });

    // If completed, credit the wallet
    if (newStatus === 'completed') {
      const snapshots = await base44.asServiceRole.entities.WalletSnapshot.filter({ wallet_id: txn.wallet_id });
      if (snapshots.length > 0) {
        const snap = snapshots[0];
        const isCredit = ['deposit', 'lipisha'].includes(txn.type);
        const newBalance = isCredit
          ? (snap.balance_cents || 0) + (txn.amount_cents || 0)
          : (snap.balance_cents || 0) - (txn.amount_cents || 0);
        await base44.asServiceRole.entities.WalletSnapshot.update(snap.id, {
          balance_cents: newBalance,
          last_synced_at: new Date().toISOString(),
        });
      }
    }

    // Create PaymentEvent for audit
    await base44.asServiceRole.entities.PaymentEvent.create({
      transaction_id: txn.id,
      event_type: 'sasapay_webhook',
      reference: transaction_reference,
      payload: body,
      processed: true,
      processed_at: new Date().toISOString(),
    });

    return Response.json({ status: 'processed', transaction_status: newStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
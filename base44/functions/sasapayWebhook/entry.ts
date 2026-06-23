import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * SasaPay C2B Webhook Handler.
 *
 * Handles two types of callbacks from SasaPay:
 * 1. C2B Payment Result Callback — posted to the CallBackURL provided in
 *    the payment request. Contains CheckoutRequestID, ResultCode, ResultDesc,
 *    TransAmount, CustomerMobile, TransactionCode, etc.
 * 2. Status Query Callback — posted in response to a status query. Contains
 *    CheckoutId, Paid, PaidAmount, ResultCode, etc.
 *
 * URL: https://your-app.base44.app/functions/invoke/sasapayWebhook?secret=XXX
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Enforce mandatory webhook secret
    const webhookSecret = Deno.env.get('SASAPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    const providedSecret = new URL(req.url).searchParams.get('secret');
    if (providedSecret !== webhookSecret) {
      return Response.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    // Determine callback type: C2B result or status query
    const checkoutRequestId = body.CheckoutRequestID || body.CheckoutId;
    const resultCode = body.ResultCode;
    const resultDesc = body.ResultDesc || body.ResultDescription;

    if (!checkoutRequestId) {
      return Response.json({ error: 'Missing CheckoutRequestID' }, { status: 400 });
    }

    // Find the transaction by checkout_request_id
    const txns = await base44.asServiceRole.entities.Transaction.filter({
      checkout_request_id: checkoutRequestId,
    });

    if (txns.length === 0) {
      // Try matching by reference (MerchantRequestID or AccountReference)
      const refTxns = await base44.asServiceRole.entities.Transaction.filter({
        reference: body.BillRefNumber || body.MerchantReference || '',
      });
      if (refTxns.length === 0) {
        return Response.json({ error: 'Transaction not found' }, { status: 404 });
      }
      txns.push(...refTxns);
    }

    const txn = txns[0];

    // Idempotency: if already completed, don't process again
    if (txn.status === 'completed') {
      return Response.json({ status: 'already_processed' });
    }

    // Determine new status: ResultCode "0" = success
    const isSuccess = resultCode === '0' || body.Paid === true;
    const newStatus = isSuccess ? 'completed' : resultCode ? 'failed' : 'pending';

    // Amount validation: verify the webhook amount matches the transaction
    const paidAmount = body.TransAmount || body.PaidAmount || body.RequestedAmount;
    if (paidAmount && txn.amount_cents) {
      const paidCents = Math.round(parseFloat(paidAmount) * 100);
      if (paidCents !== txn.amount_cents) {
        await base44.asServiceRole.entities.PaymentEvent.create({
          transaction_id: txn.id,
          event_type: 'sasapay_webhook',
          reference: checkoutRequestId,
          payload: { ...body, error: 'amount_mismatch', expected: txn.amount_cents, received: paidCents },
          processed: false,
        });
        return Response.json({ error: 'Amount mismatch' }, { status: 400 });
      }
    }

    // Update transaction status
    await base44.asServiceRole.entities.Transaction.update(txn.id, {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      failure_reason: newStatus === 'failed' ? (resultDesc || 'Payment failed') : null,
    });

    // If completed, credit the wallet
    if (newStatus === 'completed') {
      const isCredit = ['deposit', 'lipisha'].includes(txn.type);
      const snapshots = await base44.asServiceRole.entities.WalletSnapshot.filter({ wallet_id: txn.wallet_id });
      if (snapshots.length > 0) {
        const snap = snapshots[0];
        const newBalance = isCredit
          ? (snap.balance_cents || 0) + (txn.amount_cents || 0)
          : (snap.balance_cents || 0) - (txn.amount_cents || 0);
        await base44.asServiceRole.entities.WalletSnapshot.update(snap.id, {
          balance_cents: newBalance,
          last_synced_at: new Date().toISOString(),
        });
      }
    }

    // Create PaymentEvent for audit/idempotency
    await base44.asServiceRole.entities.PaymentEvent.create({
      transaction_id: txn.id,
      event_type: 'sasapay_webhook',
      reference: checkoutRequestId,
      payload: body,
      processed: true,
      processed_at: new Date().toISOString(),
    });

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: txn.wallet_id,
      action: `sasapay_c2b_${newStatus}`,
      entity_type: 'Transaction',
      entity_id: txn.id,
      description: `SasaPay C2B payment ${newStatus}. ${resultDesc || ''}`,
      new_values: {
        status: newStatus,
        transaction_code: body.TransactionCode || '',
        source_channel: body.SourceChannel || '',
      },
    });

    return Response.json({ status: 'processed', transaction_status: newStatus });
  } catch (error) {
    console.error('sasapayWebhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
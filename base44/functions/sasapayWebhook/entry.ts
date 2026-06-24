import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * SasaPay C2B Webhook Handler with HMAC-SHA512 Signature Verification.
 *
 * Handles two types of callbacks from SasaPay:
 * 1. C2B Payment Result Callback — posted to the CallBackURL provided in
 *    the payment request. Contains CheckoutRequestID, ResultCode, ResultDesc,
 *    TransAmount, CustomerMobile, TransactionCode, etc.
 * 2. Status Query Callback — posted in response to a status query. Contains
 *    CheckoutId, Paid, PaidAmount, ResultCode, etc.
 *
 * Signature Verification: X-SasaPay-Signature header contains HMAC-SHA512 of:
 * {TransactionCode}-{MerchantCode}-{AccountNumber}-{PaymentReference}-{Amount}
 * Secret key: SASAPAY_CLIENT_ID (per SasaPay docs)
 *
 * URL: https://your-app.base44.app/functions/sasapayWebhook
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Handle both JSON and form-encoded webhook bodies
    const contentType = req.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        // Try form-encoded
        const params = new URLSearchParams(text);
        body = {};
        for (const [key, value] of params.entries()) {
          try { body[key] = JSON.parse(value); } catch { body[key] = value; }
        }
      }
    }

    // HMAC-SHA512 Signature Verification
    const signature = req.headers.get('x-sasapay-signature') || '';
    const clientId = Deno.env.get('SASAPAY_CLIENT_ID');
    const merchantCode = Deno.env.get('SASAPAY_MERCHANT_CODE');
    const environment = Deno.env.get('SASAPAY_ENVIRONMENT');

    if (!clientId) {
      return Response.json({ error: 'SASAPAY_CLIENT_ID not configured' }, { status: 500 });
    }

    if (!merchantCode) {
      return Response.json({ error: 'SASAPAY_MERCHANT_CODE not configured' }, { status: 500 });
    }

    // If signature header is absent in sandbox, log warning but allow; if present, always verify
    const isSandbox = environment === 'sandbox';
    if (signature) {
      // Construct message: {TransactionCode}-{MerchantCode}-{AccountNumber}-{PaymentReference}-{Amount}
      const transactionCode = body.TransactionCode || '';
      const accountNumber = body.AccountNumber || body.account_number || '';
      const paymentReference = body.PaymentReference || body.MerchantReference || '';
      const amount = body.TransAmount || body.Amount;

      if (!transactionCode || !accountNumber || !paymentReference || amount === undefined) {
        console.warn('[sasapayWebhook] Missing required fields for signature verification', {
          transactionCode: !!transactionCode,
          accountNumber: !!accountNumber,
          paymentReference: !!paymentReference,
          amount: amount !== undefined,
        });
        return Response.json({ error: 'Missing required fields for verification' }, { status: 400 });
      }

      // Format amount to 2 decimal places
      const formattedAmount = (parseFloat(amount) || 0).toFixed(2);
      const message = `${transactionCode}-${merchantCode}-${accountNumber}-${paymentReference}-${formattedAmount}`;

      // Compute HMAC-SHA512
      const encoder = new TextEncoder();
      const msgBytes = encoder.encode(message);
      const keyBytes = encoder.encode(clientId);
      const hmacKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
      const signatureBytes = await crypto.subtle.sign('HMAC', hmacKey, msgBytes);
      const computedSignature = Array.from(new Uint8Array(signatureBytes)).map(b => b.toString(16).padStart(2, '0')).join('');

      // Constant-time comparison
      if (!constantTimeCompare(signature, computedSignature)) {
        console.error('[sasapayWebhook] Signature verification failed', { signature, computedSignature: computedSignature.substring(0, 16) + '...' });
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else if (!isSandbox) {
      // Production requires signature header
      return Response.json({ error: 'Missing X-SasaPay-Signature header' }, { status: 401 });
    } else {
      // Sandbox without signature — log warning but allow
      console.warn('[sasapayWebhook] Sandbox: X-SasaPay-Signature header absent, allowing through');
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
        reference: body.AccountReference || body.BillRefNumber || body.MerchantReference || '',
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

    // Determine new status: ResultCode "0" = success (handle both string and int)
    const resultCodeStr = resultCode !== undefined && resultCode !== null ? String(resultCode) : '';
    const isSuccess = resultCodeStr === '0' || body.Paid === true;
    const newStatus = isSuccess ? 'completed' : resultCodeStr && resultCodeStr !== '0' ? 'failed' : 'pending';

    // Amount validation: verify the webhook amount matches the transaction (M8 fix: required validation)
    const paidAmount = body.TransAmount || body.PaidAmount || body.RequestedAmount;
    if (!paidAmount || !txn.amount_cents) {
      // M8: Require paidAmount to prevent zero-amount fraud
      await base44.asServiceRole.entities.PaymentEvent.create({
        transaction_id: txn.id,
        event_type: 'sasapay_webhook',
        reference: checkoutRequestId,
        payload: { ...body, error: 'missing_amount', received: paidAmount },
        processed: false,
      });
      return Response.json({ error: 'Missing or invalid amount' }, { status: 400 });
    }
    
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

    // Update transaction status
    await base44.asServiceRole.entities.Transaction.update(txn.id, {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      failure_reason: newStatus === 'failed' ? (resultDesc || 'Payment failed') : null,
    });

    // If completed, credit/debit the wallet
    if (newStatus === 'completed') {
      const isCredit = ['deposit', 'lipisha'].includes(txn.type);
      const snapshots = await base44.asServiceRole.entities.WalletSnapshot.filter({ wallet_id: txn.wallet_id });
      let snap = snapshots[0];
      if (!snap) {
        // Create snapshot if none exists
        snap = await base44.asServiceRole.entities.WalletSnapshot.create({
          wallet_id: txn.wallet_id,
          balance_cents: 0,
          currency: 'KES',
          last_synced_at: new Date().toISOString(),
        });
      }
      const newBalance = isCredit
        ? (snap.balance_cents || 0) + (txn.amount_cents || 0)
        : (snap.balance_cents || 0) - (txn.amount_cents || 0);
      await base44.asServiceRole.entities.WalletSnapshot.update(snap.id, {
        balance_cents: newBalance,
        last_synced_at: new Date().toISOString(),
      });
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

    // Create audit log — resolve user_id from wallet
    let userId = txn.wallet_id;
    try {
      const wallet = await base44.asServiceRole.entities.Wallet.get(txn.wallet_id);
      if (wallet?.user_id) userId = wallet.user_id;
    } catch {}

    await base44.asServiceRole.entities.AuditLog.create({
      user_id: userId,
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

// Constant-time string comparison to prevent timing attacks
function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * SasaPay C2B Payment Request — Wallet Top-Up / Lipisha.
 *
 * Uses the official SasaPay C2B API (/api/v1/payments/request-payment/)
 * to collect funds from customers via M-Pesa STK push, SasaPay wallet (OTP),
 * Airtel, T-Kash, or banks.
 *
 * Payload:
 * - phone: Customer phone (254...)
 * - amountCents: Amount in cents
 * - accountRef: Merchant transaction identifier
 * - description: Transaction description
 * - transactionType: 'lipisha' or 'deposit'
 * - networkCode: '63902' (M-Pesa), '0' (SasaPay), '63903' (Airtel), '63907' (T-Kash)
 * - walletId: Rider's wallet ID (for creating local transaction record)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { phone, amountCents, accountRef, description, transactionType = 'lipisha', networkCode = '63902', walletId } = body;

    if (!phone || !amountCents) {
      return Response.json({ error: 'Missing required fields: phone, amountCents' }, { status: 400 });
    }

    const merchantCode = Deno.env.get('SASAPAY_MERCHANT_CODE');
    const clientId = Deno.env.get('SASAPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('SASAPAY_CLIENT_SECRET');

    if (!merchantCode || !clientId || !clientSecret) {
      return Response.json({ error: 'SasaPay credentials not configured' }, { status: 500 });
    }

    const token = await getSasaPayToken();

    // Convert cents to shillings
    const amountStr = (amountCents / 100).toFixed(2);
    const reference = accountRef || `BS${Date.now()}`;
    const callbackUrl = `${getBaseUrl()}/functions/invoke/sasapayWebhook?secret=${Deno.env.get('SASAPAY_WEBHOOK_SECRET')}`;

    const c2bPayload = {
      MerchantCode: merchantCode,
      NetworkCode: networkCode,
      Currency: 'KES',
      Amount: amountStr,
      CallBackURL: callbackUrl,
      PhoneNumber: phone,
      TransactionDesc: description || 'BodaSure payment',
      AccountReference: reference,
    };

    const response = await fetch(`${getSasaPayApiUrl()}/payments/request-payment/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(c2bPayload),
    });

    const respText = await response.text();
    let data;
    try {
      data = JSON.parse(respText);
    } catch {
      throw new Error(`SasaPay C2B returned non-JSON (HTTP ${response.status}). Check API endpoint and credentials.`);
    }

    if (!data.status || data.ResponseCode !== '0') {
      return Response.json({
        error: data.detail || data.ResponseDescription || 'C2B payment request failed',
        details: data,
      }, { status: 502 });
    }

    // Create a pending transaction in the database
    const txnData = {
      wallet_id: walletId || '',
      type: transactionType,
      amount_cents: amountCents,
      status: 'pending',
      reference,
      checkout_request_id: data.CheckoutRequestID || '',
      product_type: transactionType,
      counterparty_phone: phone,
      description: description || '',
    };

    const txn = await base44.asServiceRole.entities.Transaction.create(txnData);

    return Response.json({
      status: 'pending',
      mode: 'live',
      reference,
      transaction_id: txn.id,
      checkout_request_id: data.CheckoutRequestID,
      merchant_request_id: data.MerchantRequestID,
      transaction_reference: data.TransactionReference,
      payment_gateway: data.PaymentGateway,
      customer_message: data.CustomerMessage,
      requires_otp: networkCode === '0',
      message: networkCode === '0'
        ? 'OTP sent to customer. Use sasapayProcessPayment to verify.'
        : data.ResponseDescription || 'STK push sent. Awaiting customer confirmation.',
    });
  } catch (error) {
    console.error('sasapayStkPush error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function getSasaPayToken() {
  const clientId = Deno.env.get('SASAPAY_CLIENT_ID');
  const clientSecret = Deno.env.get('SASAPAY_CLIENT_SECRET');
  const env = Deno.env.get('SASAPAY_ENVIRONMENT') || 'sandbox';

  const authUrl = `https://${env}.sasapay.app/api/v1/auth/token/?grant_type=client_credentials`;
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(authUrl, {
    method: 'GET',
    headers: { 'Authorization': `Basic ${credentials}` },
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`SasaPay auth returned non-JSON (HTTP ${response.status}). Check your SASAPAY_CLIENT_ID and SASAPAY_CLIENT_SECRET.`);
  }
  if (!data.access_token) {
    throw new Error(`SasaPay auth failed: ${data.detail || data.error || text.substring(0, 200)}`);
  }
  return data.access_token;
}

function getSasaPayApiUrl() {
  const env = Deno.env.get('SASAPAY_ENVIRONMENT') || 'sandbox';
  return `https://${env}.sasapay.app/api/v1`;
}

function getBaseUrl() {
  return Deno.env.get('BASE44_APP_URL') || 'https://bodasure.local';
}
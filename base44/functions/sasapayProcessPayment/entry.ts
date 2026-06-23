import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * SasaPay C2B Process Payment — SasaPay Wallet OTP Verification.
 *
 * Required only when NetworkCode="0" (SasaPay wallet channel).
 * After the customer receives a 6-digit OTP, call this endpoint to verify
 * and complete the transaction.
 *
 * Payload:
 * - checkoutRequestId: From the initial C2B payment request response
 * - verificationCode: 6-digit OTP provided by the customer
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { checkoutRequestId, verificationCode } = await req.json();

    if (!checkoutRequestId || !verificationCode) {
      return Response.json({ error: 'Missing required fields: checkoutRequestId, verificationCode' }, { status: 400 });
    }

    const merchantCode = Deno.env.get('SASAPAY_MERCHANT_CODE');
    const token = await getSasaPayToken();

    const payload = {
      MerchantCode: merchantCode,
      CheckoutRequestID: checkoutRequestId,
      VerificationCode: verificationCode,
    };

    const response = await fetch(`${getSasaPayApiUrl()}/payments/process-payment/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const respText = await response.text();
    let data;
    try {
      data = JSON.parse(respText);
    } catch {
      throw new Error(`SasaPay process-payment returned non-JSON (HTTP ${response.status}). Check API endpoint and credentials.`);
    }

    if (!data.status) {
      return Response.json({
        error: data.detail || 'Payment processing failed',
        details: data,
      }, { status: 502 });
    }

    return Response.json({
      success: true,
      status: 'processing',
      message: data.detail || 'Transaction is being processed',
    });
  } catch (error) {
    console.error('sasapayProcessPayment error:', error);
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
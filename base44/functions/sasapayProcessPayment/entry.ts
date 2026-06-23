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

    const data = await response.json();

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

  const authUrl = `https://${env}.sasapay.app/oauth/token/`;
  const response = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
  });

  const data = await response.json();
  if (!data.access_token) throw new Error('Failed to get SasaPay access token');
  return data.access_token;
}

function getSasaPayApiUrl() {
  const env = Deno.env.get('SASAPAY_ENVIRONMENT') || 'sandbox';
  return `https://${env}.sasapay.app/api/v1`;
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * SasaPay WaaS Integration — STK Push handler.
 *
 * This function initiates a SasaPay STK Push payment.
 * Currently in MOCK mode — returns a simulated pending transaction.
 * When SasaPay credentials are provisioned, replace the mock block
 * with the actual SasaPay API call below.
 *
 * SasaPay API docs: https://developers.sasapay.ke/
 * Required secrets (set in dashboard → environment variables):
 *   - SASAPAY_CLIENT_ID
 *   - SASAPAY_CLIENT_SECRET
 *   - SASAPAY_ENVIRONMENT (sandbox | production)
 */

const SASAPAY_BASE = {
  sandbox: 'https://sandbox.sasapay.app/api/v2',
  production: 'https://api.sasapay.app/api/v2',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { phone, amountCents, accountRef, description, transactionType } = body;

    if (!phone || !amountCents) {
      return Response.json({ error: 'Missing required fields: phone, amountCents' }, { status: 400 });
    }

    const env = Deno.env.get('SASAPAY_ENVIRONMENT') || 'sandbox';
    const clientId = Deno.env.get('SASAPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('SASAPAY_CLIENT_SECRET');

    // ── MOCK MODE ──────────────────────────────────────────────
    // When credentials are not set, return a mock pending response.
    // This allows frontend development without SasaPay credentials.
    if (!clientId || !clientSecret) {
      const reference = `BS${Date.now()}${Math.floor(Math.random() * 1000)}`;
      return Response.json({
        status: 'pending',
        mode: 'mock',
        reference,
        message: 'STK push sent (mock). Prompt user to enter M-Pesa PIN.',
        checkout_request_id: `mock_checkout_${reference}`,
      });
    }
    // ── END MOCK MODE ──────────────────────────────────────────

    // ── LIVE SASAPAY STK PUSH ──────────────────────────────────
    // 1. Get access token
    let tokenData, accessToken;
    try {
      const tokenRes = await fetch(`${SASAPAY_BASE[env]}/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
      });
      tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;
    } catch (e) {
      return Response.json({ error: 'SasaPay API unreachable: ' + e.message }, { status: 502 });
    }

    if (!accessToken) {
      return Response.json({ error: 'Failed to get SasaPay access token', details: tokenData }, { status: 502 });
    }

    // 2. Initiate STK Push
    let stkData;
    try {
      const stkRes = await fetch(`${SASAPAY_BASE[env]}/payments/stk-push/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchant_code: Deno.env.get('SASAPAY_MERCHANT_CODE'),
          network_code: '63902', // Safaricom
          phone_number: phone,
          amount: Math.ceil(amountCents / 100), // Convert cents to shillings
          account_reference: accountRef || 'BodaSure',
          transaction_desc: description || 'BodaSure payment',
        }),
      });
      stkData = await stkRes.json();
    } catch (e) {
      return Response.json({ error: 'SasaPay STK push request failed: ' + e.message }, { status: 502 });
    }

    if (!stkData.success) {
      return Response.json({ error: stkData.message || 'STK push failed', details: stkData }, { status: 502 });
    }

    return Response.json({
      status: 'pending',
      mode: 'live',
      reference: stkData.transaction_reference,
      checkout_request_id: stkData.checkout_request_id,
      message: 'STK push sent. Awaiting customer confirmation.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
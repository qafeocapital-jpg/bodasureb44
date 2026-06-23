import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * SasaPay Transaction Status Query.
 *
 * Queries SasaPay for the status of a pending C2B transaction.
 * Uses /api/v1/transactions/status-query/ endpoint.
 *
 * Note: SasaPay responds asynchronously — the actual status result is
 * delivered via callback to the CallbackUrl provided. This function
 * initiates the query and also checks the local DB for the latest status.
 *
 * Payload:
 * - transactionId: Local transaction ID
 * - reference: Local transaction reference
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { transactionId, reference } = body;

    if (!transactionId && !reference) {
      return Response.json({ error: 'Missing transactionId or reference' }, { status: 400 });
    }

    // Read the transaction from the database
    let txn = null;
    if (transactionId) {
      try {
        txn = await base44.entities.Transaction.get(transactionId);
      } catch (e) {
        const txns = await base44.entities.Transaction.filter({ id: transactionId });
        txn = txns[0];
      }
    }
    if (!txn && reference) {
      const txns = await base44.entities.Transaction.filter({ reference });
      txn = txns[0];
    }

    if (!txn) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const merchantCode = Deno.env.get('SASAPAY_MERCHANT_CODE');
    const clientId = Deno.env.get('SASAPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('SASAPAY_CLIENT_SECRET');

    // If no SasaPay credentials, return the DB status (mock mode)
    if (!clientId || !clientSecret || !merchantCode) {
      return Response.json({
        status: txn.status,
        mode: 'mock',
        reference: txn.reference,
      });
    }

    // Live mode: query SasaPay API for the transaction status
    try {
      const token = await getSasaPayToken();
      const callbackUrl = `${getBaseUrl()}/functions/invoke/sasapayWebhook?secret=${Deno.env.get('SASAPAY_WEBHOOK_SECRET')}`;

      const queryPayload = {
        MerchantCode: merchantCode,
        CheckoutRequestId: txn.checkout_request_id || '',
        MerchantTransactionReference: txn.reference,
        CallbackUrl: callbackUrl,
      };

      const statusRes = await fetch(`${getSasaPayApiUrl()}/transactions/status-query/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryPayload),
      });

      const statusText = await statusRes.text();
      let statusData;
      try {
        statusData = JSON.parse(statusText);
      } catch {
        throw new Error(`SasaPay status query returned non-JSON (HTTP ${statusRes.status}).`);
      }

      // SasaPay responds with "request received" — actual status comes via callback.
      // Return current DB status; the webhook will update it when the callback arrives.
      return Response.json({
        status: txn.status,
        mode: 'live',
        reference: txn.reference,
        query_accepted: statusData.status === true,
        message: statusData.message || '',
      });
    } catch (e) {
      // If SasaPay API call fails, fall back to DB status
    }

    return Response.json({
      status: txn.status,
      mode: 'live',
      reference: txn.reference,
    });
  } catch (error) {
    console.error('sasapayQueryStatus error:', error);
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
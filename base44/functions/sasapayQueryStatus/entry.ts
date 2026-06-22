import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * SasaPay WaaS Integration — Transaction Status Query.
 *
 * Queries the status of a pending SasaPay transaction.
 * Used by the frontend to poll for STK push completion when
 * the webhook hasn't fired yet (e.g., user still entering PIN).
 *
 * SasaPay API docs: https://developers.sasapay.ke/
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
    const { transactionId, reference } = body;

    if (!transactionId && !reference) {
      return Response.json({ error: 'Missing transactionId or reference' }, { status: 400 });
    }

    // Read the transaction from the database
    let txn = null;
    try {
      if (transactionId) {
        const txns = await base44.entities.Transaction.filter({ id: transactionId });
        txn = txns[0];
      }
      if (!txn && reference) {
        const txns = await base44.entities.Transaction.filter({ reference });
        txn = txns[0];
      }
    } catch (e) {
      // Invalid ID format or other DB error
    }

    if (!txn) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const env = Deno.env.get('SASAPAY_ENVIRONMENT') || 'sandbox';
    const clientId = Deno.env.get('SASAPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('SASAPAY_CLIENT_SECRET');

    // If no SasaPay credentials, return the DB status (mock mode)
    if (!clientId || !clientSecret) {
      return Response.json({
        status: txn.status,
        mode: 'mock',
        reference: txn.reference,
      });
    }

    // Live mode: query SasaPay API for the transaction status
    try {
      const tokenRes = await fetch(`${SASAPAY_BASE[env]}/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
      });
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      if (accessToken) {
        const statusRes = await fetch(`${SASAPAY_BASE[env]}/payments/status/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            merchant_code: Deno.env.get('SASAPAY_MERCHANT_CODE'),
            checkout_request_id: txn.reference,
          }),
        });
        const statusData = await statusRes.json();

        if (statusData.success) {
          const newStatus = statusData.status === 'success' ? 'completed' : statusData.status === 'failed' ? 'failed' : 'pending';

          // If status changed, update the transaction + wallet
          if (newStatus !== txn.status) {
            await base44.asServiceRole.entities.Transaction.update(txn.id, {
              status: newStatus,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
              failure_reason: newStatus === 'failed' ? (statusData.message || 'Payment failed') : null,
            });

            // Credit wallet if just completed
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

              await base44.asServiceRole.entities.PaymentEvent.create({
                transaction_id: txn.id,
                event_type: 'sasapay_status_query',
                reference: txn.reference,
                payload: statusData,
                processed: true,
                processed_at: new Date().toISOString(),
              });
            }
          }

          return Response.json({
            status: newStatus,
            mode: 'live',
            reference: txn.reference,
          });
        }
      }
    } catch (e) {
      // If SasaPay API call fails, fall back to DB status
    }

    return Response.json({
      status: txn.status,
      mode: 'live',
      reference: txn.reference,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
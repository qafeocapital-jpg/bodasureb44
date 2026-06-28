import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * SasaPay B2C Disbursement — sends money from the BodaSure merchant account
 * to a recipient's M-Pesa / SasaPay wallet.
 *
 * Used by:
 *   - Lipa Owner (lipa_owner) — rider pays vehicle owner
 *   - Wallet Withdraw (withdraw) — rider cashes out to their own M-Pesa
 *
 * Flow:
 *   1. Verify wallet PIN (caller does this before invoking)
 *   2. Debit the sender's WalletSnapshot immediately (hold)
 *   3. Create a 'pending' Transaction with metadata
 *   4. Call SasaPay /payments/send-money/ API
 *   5. Store checkout_request_id on the Transaction
 *   6. The webhook marks it completed (or failed → reversal) when the callback arrives
 *
 * Payload:
 *   - walletId:     Sender's wallet ID (debited)
 *   - phone:        Recipient phone in E.164 (254...)
 *   - amountCents:  Amount in cents
 *   - transactionType: 'lipa_owner' | 'withdraw'
 *   - description:  Transaction description
 *   - metadata:     Optional extra context stored on the Transaction
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { walletId, phone, amountCents, transactionType = 'lipa_owner', description = '', metadata = {} } = body;

    if (!walletId || !phone || !amountCents) {
      return Response.json({ error: 'Missing required fields: walletId, phone, amountCents' }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // 1. Verify wallet belongs to the user
    const wallets = await sr.entities.Wallet.filter({ id: walletId });
    if (wallets.length === 0) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }
    const wallet = wallets[0];
    if (wallet.user_id && wallet.user_id !== user.id) {
      return Response.json({ error: 'Forbidden: wallet does not belong to you' }, { status: 403 });
    }

    // 2. Tier gate: withdraw requires Tier 2
    if (transactionType === 'withdraw' && (wallet.tier || 0) < 2) {
      return Response.json({ error: 'Tier 2 (KYC verified) required to withdraw' }, { status: 403 });
    }

    // 3. Check sufficient balance
    const snaps = await sr.entities.WalletSnapshot.filter({ wallet_id: walletId });
    const snap = snaps[0];
    if (!snap) {
      return Response.json({ error: 'Wallet snapshot not found' }, { status: 404 });
    }
    const currentBalance = snap.balance_cents || 0;
    if (currentBalance < amountCents) {
      return Response.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 4. Debit the sender's WalletSnapshot immediately (hold)
    const newBalance = currentBalance - amountCents;
    await sr.entities.WalletSnapshot.update(snap.id, {
      balance_cents: newBalance,
      last_synced_at: new Date().toISOString(),
    });

    // 5. Create the pending Transaction
    const reference = `BS${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const txn = await sr.entities.Transaction.create({
      wallet_id: walletId,
      type: transactionType,
      amount_cents: amountCents,
      status: 'pending',
      reference,
      product_type: transactionType,
      counterparty_phone: phone,
      description,
      metadata: { ...metadata, rider_id: user.id },
    });

    // 6. Call SasaPay send-money API
    const merchantCode = Deno.env.get('SASAPAY_MERCHANT_CODE');
    const clientId = Deno.env.get('SASAPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('SASAPAY_CLIENT_SECRET');

    if (!merchantCode || !clientId || !clientSecret) {
      // No SasaPay credentials — reverse the debit and fail
      await sr.entities.WalletSnapshot.update(snap.id, {
        balance_cents: currentBalance,
        last_synced_at: new Date().toISOString(),
      });
      await sr.entities.Transaction.update(txn.id, { status: 'failed', failure_reason: 'SasaPay credentials not configured' });
      return Response.json({ error: 'SasaPay credentials not configured' }, { status: 500 });
    }

    const token = await getSasaPayToken();
    const amountStr = (amountCents / 100).toFixed(2);
    const callbackUrl = `${getBaseUrl()}/functions/sasapayWebhook`;

    const sendPayload = {
      MerchantCode: merchantCode,
      Currency: 'KES',
      Amount: amountStr,
      CallBackURL: callbackUrl,
      PhoneNumber: phone,
      NetworkCode: '63902', // M-Pesa
      TransactionDesc: description || 'BodaSure disbursement',
      AccountReference: reference,
    };

    const response = await fetch(`${getSasaPayApiUrl()}/payments/send-money/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendPayload),
    });

    const respText = await response.text();
    let data;
    try {
      data = JSON.parse(respText);
    } catch {
      // Reverse the debit on API failure
      await sr.entities.WalletSnapshot.update(snap.id, {
        balance_cents: currentBalance,
        last_synced_at: new Date().toISOString(),
      });
      await sr.entities.Transaction.update(txn.id, {
        status: 'failed',
        failure_reason: `SasaPay returned non-JSON (HTTP ${response.status})`,
      });
      return Response.json({ error: 'SasaPay API returned non-JSON response' }, { status: 502 });
    }

    if (!data.status || String(data.ResponseCode) !== '0') {
      // Reverse the debit on API failure
      await sr.entities.WalletSnapshot.update(snap.id, {
        balance_cents: currentBalance,
        last_synced_at: new Date().toISOString(),
      });
      await sr.entities.Transaction.update(txn.id, {
        status: 'failed',
        failure_reason: data.detail || data.ResponseDescription || 'B2C request failed',
      });
      return Response.json({
        error: data.detail || data.ResponseDescription || 'B2C payment request failed',
        details: data,
      }, { status: 502 });
    }

    // 7. Store checkout_request_id on the Transaction
    await sr.entities.Transaction.update(txn.id, {
      checkout_request_id: data.CheckoutRequestID || '',
    });

    return Response.json({
      success: true,
      mode: 'live',
      reference,
      transaction_id: txn.id,
      checkout_request_id: data.CheckoutRequestID,
      customer_message: data.CustomerMessage || '',
      message: data.ResponseDescription || 'B2C request sent. Awaiting confirmation.',
    });
  } catch (error) {
    console.error('sasapayB2CTransfer error:', error);
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
  try { data = JSON.parse(text); } catch {
    throw new Error(`SasaPay auth returned non-JSON (HTTP ${response.status}).`);
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
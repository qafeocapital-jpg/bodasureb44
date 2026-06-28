import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * SasaPay P2P Transfer — wallet-to-wallet transfer within SasaPay WAAS.
 *
 * Used by:
 *   - Wallet Send (send) — rider sends money to another BodaSure rider
 *   - Lipa County wallet path — rider pays county licence from SasaPay wallet
 *
 * Flow:
 *   1. Verify wallet PIN (caller does this before invoking)
 *   2. Look up the recipient's SasaPay account number (from their Wallet record)
 *   3. Debit the sender's WalletSnapshot immediately (hold)
 *   4. Create a 'pending' Transaction + a pending counterparty Transaction
 *   5. Call SasaPay /payments/send-money/ with ReceiverAccountNumber
 *   6. Store checkout_request_id on the sender Transaction
 *   7. The webhook marks both transactions completed (or failed → reversal) on callback
 *
 * Payload:
 *   - walletId:        Sender's wallet ID (debited)
 *   - recipientPhone:  Recipient phone in E.164 (looked up to find their wallet)
 *   - amountCents:     Amount in cents
 *   - transactionType: 'send' | 'lipa_county' | 'penalty'
 *   - description:     Transaction description
 *   - metadata:        Extra context (billing_cycle, county_id, fee_schedule_id, etc.)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { walletId, recipientPhone, amountCents, transactionType = 'send', description = '', metadata = {} } = body;

    if (!walletId || !amountCents) {
      return Response.json({ error: 'Missing required fields: walletId, amountCents' }, { status: 400 });
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

    // 2. Look up recipient wallet by phone (for P2P send)
    let recipientWallet = null;
    let receiverAccountNumber = '';
    if (recipientPhone) {
      const recipientUsers = await sr.entities.User.filter({ phone: recipientPhone });
      if (recipientUsers.length === 0) {
        return Response.json({ error: 'Recipient not found on BodaSure. Ask them to sign up first.' }, { status: 404 });
      }
      const recipientWallets = await sr.entities.Wallet.filter({ user_id: recipientUsers[0].id, entity_type: 'personal' });
      if (recipientWallets.length === 0) {
        return Response.json({ error: 'Recipient has not activated their wallet yet.' }, { status: 404 });
      }
      recipientWallet = recipientWallets[0];
      receiverAccountNumber = recipientWallet.sasapay_account_number || '';
      if (!receiverAccountNumber) {
        return Response.json({ error: 'Recipient wallet is not linked to SasaPay yet.' }, { status: 400 });
      }
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

    // 4. Debit sender immediately (hold)
    const newBalance = currentBalance - amountCents;
    await sr.entities.WalletSnapshot.update(snap.id, {
      balance_cents: newBalance,
      last_synced_at: new Date().toISOString(),
    });

    // 5. Create the pending sender Transaction
    const reference = `BS${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const txn = await sr.entities.Transaction.create({
      wallet_id: walletId,
      type: transactionType,
      amount_cents: amountCents,
      status: 'pending',
      reference,
      product_type: transactionType,
      counterparty_wallet_id: recipientWallet?.id || null,
      counterparty_phone: recipientPhone || null,
      description,
      metadata: { ...metadata, rider_id: user.id },
    });

    // 6. For P2P send: create a pending counterparty Transaction (credit on completion)
    let counterpartyTxn = null;
    if (recipientWallet) {
      counterpartyTxn = await sr.entities.Transaction.create({
        wallet_id: recipientWallet.id,
        type: 'deposit',
        amount_cents: amountCents,
        status: 'pending',
        reference,
        product_type: 'p2p_receive',
        counterparty_wallet_id: walletId,
        counterparty_phone: user.phone || null,
        description: description || 'P2P transfer received',
      });
    }

    // 7. Call SasaPay send-money API
    const merchantCode = Deno.env.get('SASAPAY_MERCHANT_CODE');
    const clientId = Deno.env.get('SASAPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('SASAPAY_CLIENT_SECRET');

    if (!merchantCode || !clientId || !clientSecret) {
      // Reverse the debit and fail
      await sr.entities.WalletSnapshot.update(snap.id, {
        balance_cents: currentBalance,
        last_synced_at: new Date().toISOString(),
      });
      await sr.entities.Transaction.update(txn.id, { status: 'failed', failure_reason: 'SasaPay credentials not configured' });
      if (counterpartyTxn) await sr.entities.Transaction.update(counterpartyTxn.id, { status: 'failed' });
      return Response.json({ error: 'SasaPay credentials not configured' }, { status: 500 });
    }

    const token = await getSasaPayToken();
    const amountStr = (amountCents / 100).toFixed(2);
    const callbackUrl = `${getBaseUrl()}/functions/invoke/sasapayWebhook`;

    const sendPayload = {
      MerchantCode: merchantCode,
      Currency: 'KES',
      Amount: amountStr,
      CallBackURL: callbackUrl,
      TransactionDesc: description || 'BodaSure P2P transfer',
      AccountReference: reference,
    };

    // P2P to SasaPay wallet: set ReceiverAccountNumber
    if (receiverAccountNumber) {
      sendPayload.ReceiverAccountNumber = receiverAccountNumber;
      sendPayload.PhoneNumber = user.phone || ''; // sender phone for record
    } else {
      // Direct wallet-to-merchant (lipa_county wallet path): send to merchant account
      sendPayload.ReceiverAccountNumber = merchantCode;
      sendPayload.PhoneNumber = user.phone || '';
    }

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
      await sr.entities.WalletSnapshot.update(snap.id, {
        balance_cents: currentBalance,
        last_synced_at: new Date().toISOString(),
      });
      await sr.entities.Transaction.update(txn.id, {
        status: 'failed',
        failure_reason: `SasaPay returned non-JSON (HTTP ${response.status})`,
      });
      if (counterpartyTxn) await sr.entities.Transaction.update(counterpartyTxn.id, { status: 'failed' });
      return Response.json({ error: 'SasaPay API returned non-JSON response' }, { status: 502 });
    }

    if (!data.status || String(data.ResponseCode) !== '0') {
      // Reverse the debit
      await sr.entities.WalletSnapshot.update(snap.id, {
        balance_cents: currentBalance,
        last_synced_at: new Date().toISOString(),
      });
      await sr.entities.Transaction.update(txn.id, {
        status: 'failed',
        failure_reason: data.detail || data.ResponseDescription || 'P2P transfer failed',
      });
      if (counterpartyTxn) await sr.entities.Transaction.update(counterpartyTxn.id, { status: 'failed' });
      return Response.json({
        error: data.detail || data.ResponseDescription || 'P2P transfer request failed',
        details: data,
      }, { status: 502 });
    }

    // 8. Store checkout_request_id
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
      message: data.ResponseDescription || 'Transfer request sent. Awaiting confirmation.',
    });
  } catch (error) {
    console.error('sasapayP2PTransfer error:', error);
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
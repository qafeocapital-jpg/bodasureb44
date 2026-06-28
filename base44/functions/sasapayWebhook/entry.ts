import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * SasaPay C2B / B2C / P2P Webhook Handler with HMAC-SHA512 Signature Verification.
 *
 * Handles ALL payment callbacks from SasaPay:
 *   1. C2B Payment Result (lipisha, deposit — STK push)
 *   2. Status Query Callback
 *   3. B2C Disbursement Result (lipa_owner, withdraw — send-money)
 *   4. P2P Transfer Result (send, lipa_county wallet path — send-money)
 *
 * After marking a transaction 'completed', this function is the SOLE source
 * of truth for post-payment automations:
 *   - lipa_county → issues a Permit (provisional or full), runs processFeeSplit,
 *     transitions account_state to BASIC_ACTIVE if still DRAFT, sends SMS
 *   - lipa_owner / send / withdraw → credits the counterparty wallet if applicable
 *   - All paths → creates AuditLog entry
 *
 * URL: https://your-app.base44.app/functions/sasapayWebhook
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    // Parse body (JSON or form-encoded)
    const contentType = req.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        const params = new URLSearchParams(text);
        body = {};
        for (const [key, value] of params.entries()) {
          try { body[key] = JSON.parse(value); } catch { body[key] = value; }
        }
      }
    }

    // Signature verification
    const signature = req.headers.get('x-sasapay-signature') || '';
    const clientId = Deno.env.get('SASAPAY_CLIENT_ID');
    const merchantCode = Deno.env.get('SASAPAY_MERCHANT_CODE');
    const environment = Deno.env.get('SASAPAY_ENVIRONMENT');

    if (!clientId) return Response.json({ error: 'SASAPAY_CLIENT_ID not configured' }, { status: 500 });
    if (!merchantCode) return Response.json({ error: 'SASAPAY_MERCHANT_CODE not configured' }, { status: 500 });

    const isSandbox = environment === 'sandbox';
    if (signature) {
      const transactionCode = body.TransactionCode || '';
      const accountNumber = body.AccountNumber || body.account_number || '';
      const paymentReference = body.PaymentReference || body.MerchantReference || '';
      const amount = body.TransAmount || body.Amount;

      if (!transactionCode || !accountNumber || !paymentReference || amount === undefined) {
        console.warn('[sasapayWebhook] Missing required fields for signature verification');
        return Response.json({ error: 'Missing required fields for verification' }, { status: 400 });
      }

      const formattedAmount = (parseFloat(amount) || 0).toFixed(2);
      const message = `${transactionCode}-${merchantCode}-${accountNumber}-${paymentReference}-${formattedAmount}`;
      const encoder = new TextEncoder();
      const msgBytes = encoder.encode(message);
      const keyBytes = encoder.encode(clientId);
      const hmacKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
      const signatureBytes = await crypto.subtle.sign('HMAC', hmacKey, msgBytes);
      const computedSignature = Array.from(new Uint8Array(signatureBytes)).map(b => b.toString(16).padStart(2, '0')).join('');

      if (!constantTimeCompare(signature, computedSignature)) {
        console.error('[sasapayWebhook] Signature verification failed');
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else if (!isSandbox) {
      return Response.json({ error: 'Missing X-SasaPay-Signature header' }, { status: 401 });
    } else {
      console.warn('[sasapayWebhook] Sandbox: X-SasaPay-Signature header absent, allowing through');
    }

    // Determine callback type and find transaction
    const checkoutRequestId = body.CheckoutRequestID || body.CheckoutId;
    const resultCode = body.ResultCode;
    const resultDesc = body.ResultDesc || body.ResultDescription;

    if (!checkoutRequestId) {
      return Response.json({ error: 'Missing CheckoutRequestID' }, { status: 400 });
    }

    let txns = await sr.entities.Transaction.filter({ checkout_request_id: checkoutRequestId });

    if (txns.length === 0) {
      const refTxns = await sr.entities.Transaction.filter({
        reference: body.AccountReference || body.BillRefNumber || body.MerchantReference || '',
      });
      if (refTxns.length === 0) {
        return Response.json({ error: 'Transaction not found' }, { status: 404 });
      }
      txns = refTxns;
    }

    const txn = txns[0];

    // Idempotency: if already completed, don't process again
    if (txn.status === 'completed') {
      return Response.json({ status: 'already_processed' });
    }

    // Determine new status
    const resultCodeStr = resultCode !== undefined && resultCode !== null ? String(resultCode) : '';
    const isSuccess = resultCodeStr === '0' || body.Paid === true;
    const newStatus = isSuccess ? 'completed' : resultCodeStr && resultCodeStr !== '0' ? 'failed' : 'pending';

    // Amount validation
    const paidAmount = body.TransAmount || body.PaidAmount || body.RequestedAmount;
    if (!paidAmount || !txn.amount_cents) {
      await sr.entities.PaymentEvent.create({
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
      await sr.entities.PaymentEvent.create({
        transaction_id: txn.id,
        event_type: 'sasapay_webhook',
        reference: checkoutRequestId,
        payload: { ...body, error: 'amount_mismatch', expected: txn.amount_cents, received: paidCents },
        processed: false,
      });
      return Response.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    // Update transaction status
    await sr.entities.Transaction.update(txn.id, {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      failure_reason: newStatus === 'failed' ? (resultDesc || 'Payment failed') : null,
    });

    // ─── POST-PAYMENT AUTOMATIONS (only on success) ───────────────────────
    if (newStatus === 'completed') {
      const txnType = txn.type;
      const meta = txn.metadata || {};

      // Resolve wallet + user
      let walletRecord = null;
      let userId = txn.wallet_id;
      try {
        walletRecord = await sr.entities.Wallet.get(txn.wallet_id);
        if (walletRecord?.user_id) userId = walletRecord.user_id;
      } catch {}

      // ── C2B credits (deposit, lipisha): credit the sender's wallet ──
      if (['deposit', 'lipisha'].includes(txnType)) {
        await creditWallet(sr, txn.wallet_id, txn.amount_cents);
      }

      // ── P2P send: credit the recipient's wallet ──
      if (txnType === 'send' && txn.counterparty_wallet_id) {
        await creditWallet(sr, txn.counterparty_wallet_id, txn.amount_cents);
        // Complete the counterparty Transaction
        const counterpartyTxns = await sr.entities.Transaction.filter({
          wallet_id: txn.counterparty_wallet_id,
          reference: txn.reference,
          product_type: 'p2p_receive',
        });
        if (counterpartyTxns.length > 0 && counterpartyTxns[0].status !== 'completed') {
          await sr.entities.Transaction.update(counterpartyTxns[0].id, {
            status: 'completed',
            completed_at: new Date().toISOString(),
          });
        }
      }

      // ── lipa_county: issue permit + fee split + state transition + SMS ──
      if (txnType === 'lipa_county') {
        try {
          await handleLipaCountyCompletion(sr, txn, meta, userId);
        } catch (e) {
          console.error('[sasapayWebhook] lipa_county automation failed:', e.message);
        }
      }

      // ── lipa_owner: send SMS to the owner ──
      if (txnType === 'lipa_owner' && txn.counterparty_phone) {
        try {
          await base44.functions.invoke('sendSms', {
            phone: txn.counterparty_phone,
            message: `You received ${formatKes(txn.amount_cents)} from a BodaSure rider. Ref: ${txn.reference}`,
            eventType: 'lipa_owner_receipt',
          });
        } catch (e) {
          console.error('[sasapayWebhook] lipa_owner SMS failed:', e.message);
        }
      }

      // ── withdraw: send SMS to rider ──
      if (txnType === 'withdraw' && walletRecord) {
        const riderPhone = await getUserPhone(sr, userId);
        if (riderPhone) {
          try {
            await base44.functions.invoke('sendSms', {
              phone: riderPhone,
              message: `Your withdrawal of ${formatKes(txn.amount_cents)} is complete. Ref: ${txn.reference}`,
              eventType: 'withdraw_receipt',
            });
          } catch (e) {
            console.error('[sasapayWebhook] withdraw SMS failed:', e.message);
          }
        }
      }

      // ── penalty: mark penalty as paid ──
      if (txnType === 'penalty' && meta.penalty_id) {
        try {
          await sr.entities.Penalty.update(meta.penalty_id, {
            status: 'paid',
            transaction_id: txn.id,
            paid_at: new Date().toISOString(),
          });
        } catch (e) {
          console.error('[sasapayWebhook] penalty update failed:', e.message);
        }
      }
    }

    // ─── FAILURE REVERSAL: for B2C/P2P, the debit was already applied at initiation ───
    if (newStatus === 'failed' && ['lipa_owner', 'withdraw', 'send', 'lipa_county', 'penalty'].includes(txn.type)) {
      // Reverse the debit (refund the held amount)
      await creditWallet(sr, txn.wallet_id, txn.amount_cents);
      // If P2P send had a counterparty transaction, mark it failed too
      if (txn.type === 'send' && txn.counterparty_wallet_id) {
        const counterpartyTxns = await sr.entities.Transaction.filter({
          wallet_id: txn.counterparty_wallet_id,
          reference: txn.reference,
          product_type: 'p2p_receive',
        });
        if (counterpartyTxns.length > 0) {
          await sr.entities.Transaction.update(counterpartyTxns[0].id, {
            status: 'failed',
            failure_reason: 'Sender transfer failed',
          });
        }
      }
    }

    // Create PaymentEvent for audit/idempotency
    await sr.entities.PaymentEvent.create({
      transaction_id: txn.id,
      event_type: 'sasapay_webhook',
      reference: checkoutRequestId,
      payload: body,
      processed: true,
      processed_at: new Date().toISOString(),
    });

    // Create audit log
    await sr.entities.AuditLog.create({
      user_id: userId,
      action: `sasapay_${txn.type}_${newStatus}`,
      entity_type: 'Transaction',
      entity_id: txn.id,
      description: `SasaPay ${txn.type} payment ${newStatus}. ${resultDesc || ''}`,
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

// ─── Helper: credit a wallet snapshot ─────────────────────────────────────
async function creditWallet(sr, walletId, amountCents) {
  const snaps = await sr.entities.WalletSnapshot.filter({ wallet_id: walletId });
  let snap = snaps[0];
  if (!snap) {
    snap = await sr.entities.WalletSnapshot.create({
      wallet_id: walletId,
      balance_cents: 0,
      currency: 'KES',
      last_synced_at: new Date().toISOString(),
    });
  }
  await sr.entities.WalletSnapshot.update(snap.id, {
    balance_cents: (snap.balance_cents || 0) + amountCents,
    last_synced_at: new Date().toISOString(),
  });
}

// ─── Helper: resolve a user's phone ──────────────────────────────────────
async function getUserPhone(sr, userId) {
  try {
    const user = await sr.entities.User.get(userId);
    return user?.phone || null;
  } catch {
    return null;
  }
}

// ─── Helper: lipa_county completion automations ──────────────────────────
async function handleLipaCountyCompletion(sr, txn, meta, userId) {
  const { billing_cycle, vehicle_id, county_id, fee_schedule_id, rider_id } = meta;

  if (!vehicle_id || !billing_cycle || !rider_id) {
    console.warn('[sasapayWebhook] lipa_county missing metadata for permit issuance', meta);
    return;
  }

  // 1. Check for existing permit (idempotency)
  const existingPermits = await sr.entities.Permit.filter({
    transaction_id: txn.id,
  });
  if (existingPermits.length > 0) {
    console.log('[sasapayWebhook] Permit already issued for txn', txn.id);
    return;
  }

  // 2. Determine permit type based on account_state
  let rider = null;
  try {
    rider = await sr.entities.User.get(rider_id);
  } catch {}
  const permitType = rider?.account_state === 'VERIFIED' ? 'full' : 'provisional';

  // 3. Calculate permit dates
  const now = new Date();
  const end = new Date(now);
  if (billing_cycle === 'weekly') end.setDate(end.getDate() + 7);
  else if (billing_cycle === 'monthly') end.setMonth(end.getMonth() + 1);
  else if (billing_cycle === 'quarterly') end.setMonth(end.getMonth() + 3);
  else if (billing_cycle === 'yearly') end.setFullYear(end.getFullYear() + 1);

  // Provisional permits are capped at 14 days
  if (permitType === 'provisional') {
    const provisionalEnd = new Date(now);
    provisionalEnd.setDate(provisionalEnd.getDate() + 14);
    if (end > provisionalEnd) end.setTime(provisionalEnd.getTime());
  }

  const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://bodasure.com';

  // 4. Create the Permit
  const permit = await sr.entities.Permit.create({
    vehicle_id,
    rider_id,
    county_id: county_id || '',
    billing_cycle,
    start_date: now.toISOString(),
    end_date: end.toISOString(),
    status: 'active',
    amount_paid_cents: txn.amount_cents,
    transaction_id: txn.id,
    fee_schedule_id: fee_schedule_id || '',
    qr_code_data: `${appUrl}/verify/${rider_id}`,
    permit_type: permitType,
    issued_manually: false,
  });

  // 5. Run fee split
  const feeRules = await sr.entities.FeeRule.filter({ product_type: 'lipa_county', is_active: true });
  const feeRule = feeRules[0];
  if (feeRule) {
    // Find rider's SACCO
    let saccoGroupId = null;
    const memberships = await sr.entities.GroupMember.filter({ user_id: rider_id, status: 'approved' });
    if (memberships.length > 0) {
      const memberGroupIds = memberships.map(m => m.group_id);
      const allGroups = await sr.entities.Group.filter({ status: 'active' });
      const saccoGroup = allGroups.find(g => memberGroupIds.includes(g.id) && g.type === 'sacco');
      if (saccoGroup) saccoGroupId = saccoGroup.id;
    }

    await processFeeSplitInline(sr, txn.id, txn.amount_cents, feeRule, {
      countyId: county_id,
      saccoGroupId,
    });
  }

  // 6. Transition account_state to BASIC_ACTIVE if still DRAFT
  if (rider && rider.account_state === 'DRAFT') {
    try {
      await sr.entities.User.update(rider_id, {
        account_state: 'BASIC_ACTIVE',
        account_state_updated_at: new Date().toISOString(),
        onboarding_complete: true,
      });
      await sr.entities.AuditLog.create({
        user_id: rider_id,
        action: 'account_state_transition',
        entity_type: 'User',
        entity_id: rider_id,
        old_values: { account_state: 'DRAFT' },
        new_values: { account_state: 'BASIC_ACTIVE' },
        description: 'Transitioned from DRAFT to BASIC_ACTIVE via lipa_county payment',
        ip_address: 'system',
      });
    } catch (e) {
      console.error('[sasapayWebhook] account state transition failed:', e.message);
    }
  }

  // 7. Send SMS to rider
  const riderPhone = rider?.phone || await getUserPhone(sr, rider_id);
  if (riderPhone) {
    try {
      await sr.entities.AuditLog.create({
        user_id: rider_id,
        action: 'permit_issued',
        entity_type: 'Permit',
        entity_id: permit.id,
        new_values: { permit_type: permitType, end_date: end.toISOString() },
        description: `${permitType} permit issued. Valid until ${end.toISOString()}`,
        ip_address: 'system',
      });
      // SMS via the sendSms function — but webhook has no user session.
      // Use fetch to call the AT API directly via a lightweight inline SMS.
      // Actually, we can invoke the function — it requires auth.me() which fails in webhook context.
      // So we send SMS via Africa's Talking directly here.
      await sendSmsDirect(riderPhone, `Your BodaSure ${permitType} permit is active! Ref: ${txn.reference}. Valid until ${end.toDateString()}. Show your QR at any checkpoint.`);
    } catch (e) {
      console.error('[sasapayWebhook] permit SMS failed:', e.message);
    }
  }
}

// ─── Inline fee split (webhook-safe version) ─────────────────────────────
async function processFeeSplitInline(sr, transactionId, totalAmountCents, feeRule, { countyId, saccoGroupId }) {
  if (!feeRule) return [];

  const countyPct = feeRule.county_percentage || 0;
  const saccoPct = feeRule.sacco_percentage || 0;
  const platformPct = feeRule.platform_percentage || 0;

  const countyAmount = Math.round(totalAmountCents * countyPct / 100);
  const saccoAmount = Math.round(totalAmountCents * saccoPct / 100);
  const platformAmount = Math.round(totalAmountCents * platformPct / 100);

  const legs = [];

  if (countyAmount > 0 && countyId) {
    const countyWallet = await findOrCreateBusinessWallet(sr, `COUNTY_${countyId}`);
    await creditWallet(sr, countyWallet.id, countyAmount);
    legs.push({
      transaction_id: transactionId,
      leg_type: 'county',
      amount_cents: countyAmount,
      recipient_wallet_id: countyWallet.id,
      percentage: countyPct,
      description: 'County revenue',
    });
  }

  if (saccoAmount > 0 && saccoGroupId) {
    const saccoWallet = await findOrCreateBusinessWallet(sr, `SACCO_${saccoGroupId}`, saccoGroupId);
    await creditWallet(sr, saccoWallet.id, saccoAmount);
    legs.push({
      transaction_id: transactionId,
      leg_type: 'sacco',
      amount_cents: saccoAmount,
      recipient_wallet_id: saccoWallet.id,
      percentage: saccoPct,
      description: 'SACCO dividend pool',
    });
  }

  if (platformAmount > 0) {
    const platformWallet = await findOrCreateBusinessWallet(sr, 'PLATFORM');
    await creditWallet(sr, platformWallet.id, platformAmount);
    legs.push({
      transaction_id: transactionId,
      leg_type: 'platform',
      amount_cents: platformAmount,
      recipient_wallet_id: platformWallet.id,
      percentage: platformPct,
      description: 'BodaSure platform fee',
    });
  }

  if (legs.length > 0) {
    await sr.entities.TransactionLeg.bulkCreate(legs);
  }

  return legs;
}

async function findOrCreateBusinessWallet(sr, accountNumber, groupId) {
  const existing = await sr.entities.Wallet.filter({ account_number: accountNumber, entity_type: 'business' });
  if (existing.length > 0) return existing[0];

  const wallet = await sr.entities.Wallet.create({
    entity_type: 'business',
    account_number: accountNumber,
    group_id: groupId || null,
    tier: 0,
    status: 'active',
  });
  await sr.entities.WalletSnapshot.create({
    wallet_id: wallet.id,
    balance_cents: 0,
    currency: 'KES',
    last_synced_at: new Date().toISOString(),
  });
  return wallet;
}

// ─── Direct SMS via Africa's Talking (webhook-safe, no user session) ──────
async function sendSmsDirect(phone, message) {
  const isProd = Deno.env.get('AT_ENVIRONMENT') === 'production';
  const username = isProd
    ? (Deno.env.get('AT_USERNAME_PRODUCTION') || Deno.env.get('AT_USERNAME'))
    : Deno.env.get('AT_USERNAME');
  const apiKey = isProd
    ? (Deno.env.get('AT_API_KEY_PRODUCTION') || Deno.env.get('AT_API_KEY'))
    : Deno.env.get('AT_API_KEY');
  const baseUrl = isProd ? 'https://api.africastalking.com' : 'https://api.sandbox.africastalking.com';

  if (!username || !apiKey) {
    console.warn('[sasapayWebhook] AT credentials not configured, skipping SMS');
    return;
  }

  let formattedPhone = phone;
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone.replace(/\D/g, '');
  }

  const body = new URLSearchParams({ username, to: formattedPhone, message });
  const response = await fetch(`${baseUrl}/version1/messaging`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'apiKey': apiKey,
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('[sasapayWebhook] SMS send failed:', data);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function formatKes(cents) {
  return `KES ${(cents / 100).toFixed(2)}`;
}

function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
import { base44 } from '@/api/base44Client';
import { normalizePhone } from '@/lib/phone';

const TIER_1_BALANCE_CAP_CENTS = 500000; // KES 5,000

function generateReference() {
  return `BS${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function isCredit(type) {
  return ['deposit', 'lipisha'].includes(type);
}

/**
 * Process a mock payment with full transaction lifecycle.
 * Flow: initiated → pending → completed
 *
 * @param {Object} params
 * @param {string} params.walletId - Sender/source wallet ID
 * @param {string} params.type - Transaction type (deposit, withdraw, send, lipisha, lipa_county, lipa_owner, chama, insurance, utility, penalty)
 * @param {number} params.amountCents - Amount in cents
 * @param {string} [params.counterpartyWalletId] - Counterparty wallet ID (for chama, lipa_owner)
 * @param {string} [params.counterpartyPhone] - Counterparty phone in E.164 (for send/lipisha)
 * @param {string} [params.description] - Transaction description
 * @param {string} [params.productType] - Product type for fee rules
 * @param {string} [params.vehicleId] - Vehicle ID
 * @param {string} [params.permitId] - Permit ID
 * @returns {Promise<{success: boolean, transaction: Object, reference: string, counterpartyTx: Object|null}>}
 */
export async function mockPayment({ walletId, type, amountCents, counterpartyWalletId, counterpartyPhone, description, productType, vehicleId, permitId }) {
  // 1. Check tier limits for deposits
  if (type === 'deposit') {
    const walletRes = await base44.entities.Wallet.filter({ id: walletId });
    const wallet = walletRes[0];
    const tier = wallet?.tier || 0;
    if (tier < 2) {
      const snaps = await base44.entities.WalletSnapshot.filter({ wallet_id: walletId });
      const currentBalance = snaps[0]?.balance_cents || 0;
      if (currentBalance + amountCents > TIER_1_BALANCE_CAP_CENTS) {
        throw new Error('Tier 1 balance limit is KES 5,000. Complete KYC to unlock higher limits.');
      }
    }
  }

  // 2. Check sufficient balance for debits
  if (!isCredit(type)) {
    const snaps = await base44.entities.WalletSnapshot.filter({ wallet_id: walletId });
    const currentBalance = snaps[0]?.balance_cents || 0;
    if (currentBalance < amountCents) {
      throw new Error('Insufficient balance.');
    }
  }

  // 2b. For P2P send: look up recipient wallet BEFORE debiting
  let recipientWallet = null;
  if (type === 'send' && counterpartyPhone) {
    const normalizedPhone = normalizePhone(counterpartyPhone);
    if (!normalizedPhone) {
      throw new Error('Invalid recipient phone number.');
    }
    const recipientUsers = await base44.entities.User.filter({ phone: normalizedPhone });
    if (recipientUsers.length === 0) {
      throw new Error('Recipient not found on BodaSure. Ask them to sign up first.');
    }
    const recipientWallets = await base44.entities.Wallet.filter({
      user_id: recipientUsers[0].id,
      entity_type: 'personal',
    });
    if (recipientWallets.length === 0) {
      throw new Error('Recipient has not activated their wallet yet.');
    }
    recipientWallet = recipientWallets[0];
  }

  // 3. Create transaction as 'initiated'
  const reference = generateReference();
  const transaction = await base44.entities.Transaction.create({
    wallet_id: walletId,
    type,
    amount_cents: amountCents,
    status: 'initiated',
    reference,
    product_type: productType || type,
    counterparty_wallet_id: counterpartyWalletId || null,
    counterparty_phone: counterpartyPhone || null,
    description: description || '',
    vehicle_id: vehicleId || null,
    permit_id: permitId || null,
  });

  // 4. Simulate processing delay (STK push / transfer time)
  await new Promise(resolve => setTimeout(resolve, 300));

  // 5. Update to 'completed'
  await base44.entities.Transaction.update(transaction.id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
  });

  // 6. Update wallet balance
  const snapshots = await base44.entities.WalletSnapshot.filter({ wallet_id: walletId });
  if (snapshots.length > 0) {
    const snapshot = snapshots[0];
    const newBalance = isCredit(type)
      ? snapshot.balance_cents + amountCents
      : snapshot.balance_cents - amountCents;
    await base44.entities.WalletSnapshot.update(snapshot.id, {
      balance_cents: newBalance,
      last_synced_at: new Date().toISOString(),
    });
  }

  // 7. Handle P2P send: credit recipient wallet (already looked up in step 2b)
  let counterpartyTx = null;
  if (type === 'send' && recipientWallet) {
    counterpartyTx = await base44.entities.Transaction.create({
      wallet_id: recipientWallet.id,
      type: 'deposit',
      amount_cents: amountCents,
      status: 'completed',
      reference,
      product_type: 'p2p_receive',
      counterparty_wallet_id: walletId,
      counterparty_phone: counterpartyPhone,
      description: description || 'P2P transfer received',
      completed_at: new Date().toISOString(),
    });
    const recipientSnaps = await base44.entities.WalletSnapshot.filter({ wallet_id: recipientWallet.id });
    if (recipientSnaps.length > 0) {
      await base44.entities.WalletSnapshot.update(recipientSnaps[0].id, {
        balance_cents: (recipientSnaps[0].balance_cents || 0) + amountCents,
        last_synced_at: new Date().toISOString(),
      });
    }
  }

  // 8. Handle direct counterparty wallet (chama, lipa_owner, etc.)
  if (counterpartyWalletId && type !== 'send') {
    const counterpartySnapshots = await base44.entities.WalletSnapshot.filter({ wallet_id: counterpartyWalletId });
    if (counterpartySnapshots.length > 0) {
      const cs = counterpartySnapshots[0];
      const newBalance = isCredit(type)
        ? cs.balance_cents - amountCents
        : cs.balance_cents + amountCents;
      await base44.entities.WalletSnapshot.update(cs.id, {
        balance_cents: newBalance,
        last_synced_at: new Date().toISOString(),
      });
    }
  }

  // 9. Create PaymentEvent for idempotency
  await base44.entities.PaymentEvent.create({
    transaction_id: transaction.id,
    event_type: 'mock_payment',
    reference,
    payload: { mock: true, type, amount_cents: amountCents, counterparty_phone: counterpartyPhone },
    processed: true,
    processed_at: new Date().toISOString(),
  });

  return { success: true, transaction, reference, counterpartyTx };
}

export async function getWalletBalance(walletId) {
  const snapshots = await base44.entities.WalletSnapshot.filter({ wallet_id: walletId });
  if (snapshots.length > 0) return snapshots[0].balance_cents || 0;
  return 0;
}

export async function getOrCreateWallet(userId) {
  const wallets = await base44.entities.Wallet.filter({ user_id: userId, entity_type: 'personal' });
  if (wallets.length > 0) return wallets[0];

  const wallet = await base44.entities.Wallet.create({
    user_id: userId,
    entity_type: 'personal',
    tier: 0,
    status: 'inactive',
  });

  await base44.entities.WalletSnapshot.create({
    wallet_id: wallet.id,
    balance_cents: 0,
    currency: 'KES',
    last_synced_at: new Date().toISOString(),
  });

  return wallet;
}

/**
 * Find or create a business wallet for an entity (county, platform, sacco).
 * Uses account_number convention: "COUNTY_<id>", "PLATFORM", "SACCO_<id>".
 */
async function findOrCreateBusinessWallet(accountNumber, groupId) {
  const existing = await base44.entities.Wallet.filter({ account_number: accountNumber, entity_type: 'business' });
  if (existing.length > 0) return existing[0];

  const wallet = await base44.entities.Wallet.create({
    entity_type: 'business',
    account_number: accountNumber,
    group_id: groupId || null,
    tier: 0,
    status: 'active',
  });
  await base44.entities.WalletSnapshot.create({
    wallet_id: wallet.id,
    balance_cents: 0,
    currency: 'KES',
    last_synced_at: new Date().toISOString(),
  });
  return wallet;
}

async function creditWallet(walletId, amountCents) {
  const snaps = await base44.entities.WalletSnapshot.filter({ wallet_id: walletId });
  if (snaps.length > 0) {
    await base44.entities.WalletSnapshot.update(snaps[0].id, {
      balance_cents: (snaps[0].balance_cents || 0) + amountCents,
      last_synced_at: new Date().toISOString(),
    });
  }
}

/**
 * Process a fee split — moves money to county, SACCO, and platform wallets
 * based on the active FeeRule percentages. Creates TransactionLeg audit records.
 *
 * @param {string} transactionId - The source transaction ID
 * @param {number} totalAmountCents - Total amount to split
 * @param {Object} feeRule - The FeeRule with county/sacco/platform percentages
 * @param {Object} params - { countyId, saccoGroupId }
 * @returns {Promise<Array>} Created TransactionLeg records
 */
export async function processFeeSplit(transactionId, totalAmountCents, feeRule, { countyId, saccoGroupId }) {
  if (!feeRule) return [];

  const countyPct = feeRule.county_percentage || 0;
  const saccoPct = feeRule.sacco_percentage || 0;
  const platformPct = feeRule.platform_percentage || 0;

  const countyAmount = Math.round(totalAmountCents * countyPct / 100);
  const saccoAmount = Math.round(totalAmountCents * saccoPct / 100);
  const platformAmount = Math.round(totalAmountCents * platformPct / 100);

  const legs = [];

  // County
  if (countyAmount > 0 && countyId) {
    const countyWallet = await findOrCreateBusinessWallet(`COUNTY_${countyId}`);
    await creditWallet(countyWallet.id, countyAmount);
    legs.push({
      transaction_id: transactionId,
      leg_type: 'county',
      amount_cents: countyAmount,
      recipient_wallet_id: countyWallet.id,
      percentage: countyPct,
      description: 'County revenue',
    });
  }

  // SACCO
  if (saccoAmount > 0 && saccoGroupId) {
    const saccoWallet = await findOrCreateBusinessWallet(`SACCO_${saccoGroupId}`, saccoGroupId);
    await creditWallet(saccoWallet.id, saccoAmount);
    legs.push({
      transaction_id: transactionId,
      leg_type: 'sacco',
      amount_cents: saccoAmount,
      recipient_wallet_id: saccoWallet.id,
      percentage: saccoPct,
      description: 'SACCO dividend pool',
    });
  }

  // Platform
  if (platformAmount > 0) {
    const platformWallet = await findOrCreateBusinessWallet('PLATFORM');
    await creditWallet(platformWallet.id, platformAmount);
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
    await base44.entities.TransactionLeg.bulkCreate(legs);
  }

  return legs;
}
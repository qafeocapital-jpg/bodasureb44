import { base44 } from '@/api/base44Client';

function generateReference() {
  return `BS${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function isCredit(type) {
  return ['deposit', 'lipisha'].includes(type);
}

export async function mockPayment({ walletId, type, amountCents, counterpartyWalletId, description, productType, vehicleId, permitId }) {
  await new Promise(resolve => setTimeout(resolve, 1200));

  const reference = generateReference();

  const transaction = await base44.entities.Transaction.create({
    wallet_id: walletId,
    type,
    amount_cents: amountCents,
    status: 'completed',
    reference,
    product_type: productType || type,
    counterparty_wallet_id: counterpartyWalletId || null,
    description: description || '',
    vehicle_id: vehicleId || null,
    permit_id: permitId || null,
    completed_at: new Date().toISOString()
  });

  const snapshots = await base44.entities.WalletSnapshot.filter({ wallet_id: walletId });
  if (snapshots.length > 0) {
    const snapshot = snapshots[0];
    const newBalance = isCredit(type)
      ? snapshot.balance_cents + amountCents
      : snapshot.balance_cents - amountCents;
    await base44.entities.WalletSnapshot.update(snapshot.id, {
      balance_cents: newBalance,
      last_synced_at: new Date().toISOString()
    });
  }

  if (counterpartyWalletId) {
    const counterpartySnapshots = await base44.entities.WalletSnapshot.filter({ wallet_id: counterpartyWalletId });
    if (counterpartySnapshots.length > 0) {
      const cs = counterpartySnapshots[0];
      const newBalance = isCredit(type)
        ? cs.balance_cents - amountCents
        : cs.balance_cents + amountCents;
      await base44.entities.WalletSnapshot.update(cs.id, {
        balance_cents: newBalance,
        last_synced_at: new Date().toISOString()
      });
    }
  }

  await base44.entities.PaymentEvent.create({
    transaction_id: transaction.id,
    event_type: 'mock_payment',
    reference,
    payload: { mock: true, type, amount_cents: amountCents },
    processed: true,
    processed_at: new Date().toISOString()
  });

  return { success: true, transaction, reference };
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
    status: 'inactive'
  });

  await base44.entities.WalletSnapshot.create({
    wallet_id: wallet.id,
    balance_cents: 0,
    currency: 'KES',
    last_synced_at: new Date().toISOString()
  });

  return wallet;
}
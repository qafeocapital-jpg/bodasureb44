import { base44 } from '@/api/base44Client';

/**
 * Client-side fee engine — looks up the SasapayFeeTier for a given
 * transaction type and amount, computes the SasaPay base fee + BodaSure
 * markup, and returns the bundled total fee the rider will see.
 *
 * @param {string} transactionType - 'collection', 'p2p', 'transfer_mobile', 'transfer_bank', 'b2c'
 * @param {number} amountKes - Transaction amount in KES (shillings, not cents)
 * @returns {Promise<Object|null>} - { sasapayFeeKes, bodasureMarkupKes, totalFeeKes, feePayer, tier }
 */
export async function lookupFee(transactionType, amountKes) {
  if (!transactionType || !amountKes || amountKes <= 0) return null;

  const tiers = await base44.entities.SasapayFeeTier.filter({
    transaction_type: transactionType,
    is_active: true,
  });

  const tier = tiers.find(
    t => amountKes >= t.min_amount_kes && amountKes <= t.max_amount_kes
  );

  if (!tier) return null;

  // SasaPay base fee
  let sasapayFee = tier.sasapay_base_fee_kes || 0;
  if (tier.is_percentage) {
    sasapayFee = (amountKes * tier.sasapay_base_fee_kes) / 100;
    // Collection is capped at KES 150
    if (transactionType === 'collection') {
      sasapayFee = Math.min(sasapayFee, 150);
    }
  }

  // BodaSure markup
  let bodasureMarkup = 0;
  if (tier.bodasure_markup_type === 'percentage') {
    bodasureMarkup = (amountKes * (tier.bodasure_markup_pct || 0)) / 100;
  } else {
    bodasureMarkup = tier.bodasure_markup_kes || 0;
  }

  return {
    sasapayFeeKes: Math.round(sasapayFee * 100),
    bodasureMarkupKes: Math.round(bodasureMarkup * 100),
    totalFeeKes: Math.round((sasapayFee + bodasureMarkup) * 100),
    feePayer: tier.fee_payer,
    tier,
  };
}

/**
 * Check daily transaction limits before submitting.
 * Calls the getTransactionLimits backend function.
 *
 * @param {string} walletId
 * @param {string} transactionType - 'lipisha', 'withdraw', 'send', 'deposit'
 * @param {number} amountKes - The amount the rider wants to transact (in KES)
 * @returns {Promise<Object>} - { canProceed, dailyUsedKes, dailyLimitKes, perTxLimitKes, remainingKes, errorMessage }
 */
export async function checkTransactionLimits(walletId, transactionType, amountKes) {
  try {
    const res = await base44.functions.invoke('getTransactionLimits', {
      wallet_id: walletId,
      transaction_type: transactionType,
    });
    const data = res.data;

    const perTxLimit = data.per_tx_limit_kes;
    const remaining = data.remaining_kes;

    if (amountKes > perTxLimit) {
      return {
        canProceed: false,
        errorMessage: `Per-transaction limit is KES ${perTxLimit.toLocaleString()}. Your amount of KES ${amountKes.toLocaleString()} exceeds this.`,
        ...data,
      };
    }

    if (amountKes > remaining) {
      return {
        canProceed: false,
        errorMessage: `Daily ${transactionType} limit is KES ${data.daily_limit_kes.toLocaleString()}. You have used KES ${data.daily_used_kes.toLocaleString()} today. You can only transact KES ${remaining.toLocaleString()} more.`,
        ...data,
      };
    }

    return { canProceed: true, ...data };
  } catch (e) {
    // If limit check fails, allow the transaction (fail open) but provide zeroed defaults
    return {
      canProceed: true,
      error: e.message,
      daily_used_kes: 0,
      daily_limit_kes: 0,
      per_tx_limit_kes: 0,
      remaining_kes: 0,
    };
  }
}
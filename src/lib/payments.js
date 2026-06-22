import { base44 } from '@/api/base44Client';
import { mockPayment, getWalletBalance } from '@/lib/mockPayments';
import { normalizePhone } from '@/lib/phone';

/**
 * Unified Payment Service — abstracts mock vs live SasaPay.
 *
 * STK-based flows (lipisha, deposit):
 *   - Live mode: calls sasapayStkPush → returns pending → webhook completes it
 *   - Mock mode: falls back to mockPayment (instant completion)
 *
 * Internal wallet flows (lipa_county, lipa_owner, send, chama, penalty, insurance):
 *   - Always uses mockPayment (instant wallet-to-wallet transfer)
 */

/**
 * Initiate an STK Push payment (for lipisha / wallet top-up).
 * Creates the transaction as 'initiated', then calls the sasapayStkPush
 * backend function. In live mode, the webhook will complete it later.
 *
 * @param {Object} params
 * @param {string} params.walletId - Rider's wallet ID (receives the credit)
 * @param {string} params.phone - Customer phone in E.164
 * @param {number} params.amountCents - Amount in cents
 * @param {string} [params.description] - Transaction description
 * @param {string} [params.transactionType] - 'lipisha' or 'deposit'
 * @returns {Promise<{success, mode, reference, status, message}>}
 */
export async function initiateStkPush({ walletId, phone, amountCents, description, transactionType = 'lipisha' }) {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error('Invalid phone number.');

  // Try live SasaPay STK Push
  try {
    const res = await base44.functions.invoke('sasapayStkPush', {
      phone: normalized,
      amountCents,
      accountRef: 'BodaSure',
      description: description || 'BodaSure payment',
      transactionType,
    });
    const data = res.data;

    // If live mode, create a pending transaction to be completed by webhook
    if (data.mode === 'live' && data.status === 'pending') {
      await base44.entities.Transaction.create({
        wallet_id: walletId,
        type: transactionType,
        amount_cents: amountCents,
        status: 'pending',
        reference: data.reference,
        checkout_request_id: data.checkout_request_id || null,
        product_type: transactionType,
        counterparty_phone: normalized,
        description: description || '',
      });
      return {
        success: true,
        mode: 'live',
        reference: data.reference,
        status: 'pending',
        message: data.message || 'STK push sent. Awaiting customer confirmation.',
      };
    }
  } catch (e) {
    // If the function call fails, fall through to mock mode
  }

  // Fall back to mock mode (instant completion)
  const result = await mockPayment({
    walletId,
    type: transactionType,
    amountCents,
    counterpartyPhone: normalized,
    description,
    productType: transactionType,
  });

  return {
    success: true,
    mode: 'mock',
    reference: result.reference,
    status: 'completed',
    message: 'Payment completed (mock mode).',
  };
}

/**
 * Process an internal wallet-to-wallet payment (lipa_county, lipa_owner, send, etc.)
 * Always uses the mock payment engine — these are intra-platform transfers.
 */
export async function processWalletPayment(params) {
  return mockPayment(params);
}

/**
 * Query the status of a pending transaction.
 * In live mode, calls the sasapayQueryStatus backend function.
 *
 * @param {string} transactionId - The transaction ID
 * @param {string} reference - The transaction reference
 * @returns {Promise<{status, mode}>}
 */
export async function queryTransactionStatus(transactionId, reference) {
  try {
    const res = await base44.functions.invoke('sasapayQueryStatus', {
      transactionId,
      reference,
    });
    return res.data;
  } catch (e) {
    // Fallback: read the transaction directly
    const txns = await base44.entities.Transaction.filter({ id: transactionId });
    return { status: txns[0]?.status || 'unknown', mode: 'fallback' };
  }
}

export { getWalletBalance, getOrCreateWallet, processFeeSplit } from '@/lib/mockPayments';
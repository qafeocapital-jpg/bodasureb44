import { base44 } from '@/api/base44Client';
import { mockPayment, getWalletBalance } from '@/lib/mockPayments';
import { normalizePhone } from '@/lib/phone';

/**
 * Unified Payment Service — abstracts mock vs live SasaPay C2B.
 *
 * C2B flows (lipisha, deposit):
 *   - Live mode: calls sasapayStkPush (C2B /api/v1/payments/request-payment/)
 *     → returns pending → webhook completes it
 *   - SasaPay wallet: returns requires_otp=true → frontend collects OTP →
 *     calls sasapayProcessPayment to verify
 *   - Mock mode: falls back to mockPayment (instant completion)
 *
 * Internal wallet flows (lipa_county, lipa_owner, send, chama, penalty, insurance):
 *   - Always uses mockPayment (instant wallet-to-wallet transfer)
 */

/**
 * Initiate a C2B payment (for lipisha / wallet top-up).
 * Creates the transaction as 'pending', then calls the sasapayStkPush
 * backend function. The webhook will complete it when the callback arrives.
 *
 * @param {Object} params
 * @param {string} params.walletId - Rider's wallet ID (receives the credit)
 * @param {string} params.phone - Customer phone in E.164
 * @param {number} params.amountCents - Amount in cents
 * @param {string} [params.description] - Transaction description
 * @param {string} [params.transactionType] - 'lipisha' or 'deposit'
 * @param {string} [params.networkCode] - '63902' (M-Pesa), '0' (SasaPay), '63903' (Airtel), '63907' (T-Kash)
 * @returns {Promise<{success, mode, reference, status, message, requires_otp?}>}
 */
export async function initiateStkPush({ walletId, phone, amountCents, description, transactionType = 'lipisha', networkCode = '63902' }) {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error('Invalid phone number.');

  // Try live SasaPay C2B
  try {
    const res = await base44.functions.invoke('sasapayStkPush', {
      phone: normalized,
      amountCents,
      accountRef: `BS${Date.now()}`,
      description: description || 'BodaSure payment',
      transactionType,
      networkCode,
      walletId,
    });
    const data = res.data;

    if (data.mode === 'live' && (data.status === 'pending' || data.requires_otp)) {
      return {
        success: true,
        mode: 'live',
        reference: data.reference,
        transactionId: data.transaction_id,
        checkoutRequestId: data.checkout_request_id,
        status: 'pending',
        requiresOtp: data.requires_otp || false,
        paymentGateway: data.payment_gateway || '',
        customerMessage: data.customer_message || '',
        message: data.message || 'Payment request sent. Awaiting customer confirmation.',
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
 * Verify SasaPay wallet OTP for a pending C2B transaction.
 * Only needed when networkCode="0" (SasaPay wallet channel).
 *
 * @param {string} checkoutRequestId - From the initial C2B payment response
 * @param {string} verificationCode - 6-digit OTP from the customer
 * @returns {Promise<{success, status, message}>}
 */
export async function verifySasaPayOtp(checkoutRequestId, verificationCode) {
  try {
    const res = await base44.functions.invoke('sasapayProcessPayment', {
      checkoutRequestId,
      verificationCode,
    });
    return {
      success: res.data.success,
      status: res.data.status,
      message: res.data.message,
    };
  } catch (e) {
    return {
      success: false,
      status: 'failed',
      message: e.message || 'OTP verification failed',
    };
  }
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
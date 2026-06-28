import { base44 } from '@/api/base44Client';
import { mockPayment, getWalletBalance } from '@/lib/mockPayments';
import { normalizePhone } from '@/lib/phone';

/**
 * Unified Payment Service — production SasaPay integration.
 *
 * All payment flows route through real SasaPay APIs:
 *   - C2B (lipisha, deposit): sasapayStkPush → webhook completes
 *   - B2C (lipa_owner, withdraw): sasapayB2CTransfer → webhook completes
 *   - P2P (send, lipa_county wallet path, penalty): sasapayP2PTransfer → webhook completes
 *
 * Mock mode is ONLY available when VITE_PAYMENT_MODE === 'sandbox_mock'
 * (local dev). In deployed builds, mock fallbacks are removed entirely.
 */

const USE_MOCK = import.meta.env.VITE_PAYMENT_MODE === 'sandbox_mock';

/**
 * Initiate a C2B payment (lipisha / wallet top-up).
 * Creates a 'pending' Transaction, calls sasapayStkPush.
 * The webhook completes it when the callback arrives.
 */
export async function initiateStkPush({ walletId, phone, amountCents, description, transactionType = 'lipisha', networkCode = '63902' }) {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error('Invalid phone number.');

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
    if (!USE_MOCK) throw e;
  }

  // Mock fallback (local dev only)
  if (USE_MOCK) {
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

  throw new Error('Payment request failed. Please try again.');
}

/**
 * Verify SasaPay wallet OTP for a pending C2B transaction.
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
 * Initiate a B2C disbursement (lipa_owner, withdraw).
 * Debits sender wallet immediately (hold), calls sasapayB2CTransfer.
 * The webhook completes it (or reverses on failure).
 */
export async function initiateB2CTransfer({ walletId, phone, amountCents, transactionType = 'lipa_owner', description, metadata }) {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error('Invalid recipient phone number.');

  const res = await base44.functions.invoke('sasapayB2CTransfer', {
    walletId,
    phone: normalized,
    amountCents,
    transactionType,
    description: description || '',
    metadata: metadata || {},
  });
  const data = res.data;

  if (!data.success) {
    throw new Error(data.error || 'B2C transfer failed');
  }

  return {
    success: true,
    mode: 'live',
    reference: data.reference,
    transactionId: data.transaction_id,
    checkoutRequestId: data.checkout_request_id,
    status: 'pending',
    message: data.message || 'Disbursement request sent. Awaiting confirmation.',
  };
}

/**
 * Initiate a P2P transfer (send, lipa_county wallet path, penalty).
 * Debits sender wallet immediately (hold), calls sasapayP2PTransfer.
 * The webhook completes it (or reverses on failure).
 */
export async function initiateP2PTransfer({ walletId, recipientPhone, amountCents, transactionType = 'send', description, metadata }) {
  const normalized = recipientPhone ? normalizePhone(recipientPhone) : null;

  const res = await base44.functions.invoke('sasapayP2PTransfer', {
    walletId,
    recipientPhone: normalized,
    amountCents,
    transactionType,
    description: description || '',
    metadata: metadata || {},
  });
  const data = res.data;

  if (!data.success) {
    throw new Error(data.error || 'P2P transfer failed');
  }

  return {
    success: true,
    mode: 'live',
    reference: data.reference,
    transactionId: data.transaction_id,
    checkoutRequestId: data.checkout_request_id,
    status: 'pending',
    message: data.message || 'Transfer request sent. Awaiting confirmation.',
  };
}

/**
 * Process an internal wallet payment — routes to the correct SasaPay API
 * based on transaction type. No mock fallback in production.
 *
 * @param {Object} params
 * @param {string} params.walletId
 * @param {string} params.type - 'lipa_county' | 'lipa_owner' | 'send' | 'withdraw' | 'penalty'
 * @param {number} params.amountCents
 * @param {string} [params.counterpartyPhone]
 * @param {string} [params.description]
 * @param {string} [params.productType]
 * @param {string} [params.vehicleId]
 * @param {string} [params.permitId]
 * @param {Object} [params.metadata] - Extra context (billing_cycle, county_id, fee_schedule_id, etc.)
 */
export async function processWalletPayment(params) {
  const { walletId, type, amountCents, counterpartyPhone, description, productType, vehicleId, permitId, metadata } = params;

  // B2C disbursements: lipa_owner, withdraw
  if (type === 'lipa_owner' || type === 'withdraw') {
    if (!counterpartyPhone) throw new Error('Recipient phone is required.');
    return initiateB2CTransfer({
      walletId,
      phone: counterpartyPhone,
      amountCents,
      transactionType: type,
      description,
      metadata: { ...(metadata || {}), vehicle_id: vehicleId, permit_id: permitId },
    });
  }

  // P2P transfers: send, lipa_county (wallet path), penalty
  if (type === 'send' || type === 'lipa_county' || type === 'penalty') {
    return initiateP2PTransfer({
      walletId,
      recipientPhone: counterpartyPhone,
      amountCents,
      transactionType: type,
      description,
      metadata: { ...(metadata || {}), vehicle_id: vehicleId, permit_id: permitId, product_type: productType },
    });
  }

  // Fallback for other types (chama, insurance, utility) — still mock for now
  if (USE_MOCK) {
    return mockPayment(params);
  }

  throw new Error(`Payment type '${type}' is not yet supported via SasaPay.`);
}

/**
 * Query the status of a pending transaction.
 */
export async function queryTransactionStatus(transactionId, reference) {
  try {
    const res = await base44.functions.invoke('sasapayQueryStatus', {
      transactionId,
      reference,
    });
    return res.data;
  } catch (e) {
    const txns = await base44.entities.Transaction.filter({ id: transactionId });
    return { status: txns[0]?.status || 'unknown', mode: 'fallback' };
  }
}

export { getWalletBalance, getOrCreateWallet, processFeeSplit } from '@/lib/mockPayments';
import { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { queryTransactionStatus } from '@/lib/payments';

/**
 * Polls a SasaPay transaction until it reaches a terminal state (completed/failed)
 * or times out after 120 seconds (12 attempts × 10s intervals).
 *
 * Also polls for a new Permit record — useful for lipa_county where the
 * permit is issued by the webhook after payment completion.
 *
 * @param {Object} options
 * @param {string|null} options.transactionId - The transaction ID to poll
 * @param {string|null} options.reference - The transaction reference
 * @param {boolean} options.watchPermit - If true, also poll for a new Permit
 * @param {string|null} options.vehicleId - Vehicle ID to watch for a new permit
 * @param {string|null} options.riderId - Rider ID to watch for a new permit
 * @returns {{ status, permitId, polling, attempts, error }}
 *   - status: 'pending' | 'completed' | 'failed' | 'timeout' | null
 *   - permitId: string | null (only set when watchPermit is true and permit appears)
 *   - polling: boolean
 *   - attempts: number
 *   - error: string | null
 */
export function usePaymentPolling({ transactionId, reference, watchPermit = false, vehicleId, riderId }) {
  const [status, setStatus] = useState(null);
  const [permitId, setPermitId] = useState(null);
  const [polling, setPolling] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const MAX_ATTEMPTS = 12; // 12 × 10s = 120s
  const INTERVAL_MS = 10000;

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (mountedRef.current) setPolling(false);
  }, []);

  const checkPermit = useCallback(async () => {
    if (!watchPermit) return null;
    try {
      if (riderId) {
        const permits = await base44.entities.Permit.filter({ rider_id: riderId, status: 'active' }, '-created_date', 1);
        if (permits.length > 0 && permits[0].transaction_id === transactionId) {
          return permits[0].id;
        }
      }
      if (vehicleId && transactionId) {
        const permits = await base44.entities.Permit.filter({ vehicle_id: vehicleId, transaction_id: transactionId }, '-created_date', 1);
        if (permits.length > 0) {
          return permits[0].id;
        }
      }
    } catch {}
    return null;
  }, [watchPermit, riderId, vehicleId, transactionId]);

  const poll = useCallback(async () => {
    if (!mountedRef.current) return;
    setAttempts(prev => {
      const next = prev + 1;
      if (next >= MAX_ATTEMPTS) {
        stop();
        if (mountedRef.current) setStatus('timeout');
      }
      return next;
    });

    try {
      // Check for permit first (if watching) — permit appearance means webhook completed
      if (watchPermit) {
        const foundPermitId = await checkPermit();
        if (foundPermitId) {
          if (mountedRef.current) {
            setStatus('completed');
            setPermitId(foundPermitId);
            setPolling(false);
          }
          stop();
          return;
        }
      }

      // Query transaction status
      const result = await queryTransactionStatus(transactionId, reference);

      if (!mountedRef.current) return;

      if (result.status === 'completed') {
        // If watching permit, give it one more cycle for the webhook to create it
        if (watchPermit) {
          const foundPermitId = await checkPermit();
          if (foundPermitId) {
            setStatus('completed');
            setPermitId(foundPermitId);
            setPolling(false);
            stop();
            return;
          }
          // Transaction is complete but permit not yet created — keep polling
          return;
        }
        setStatus('completed');
        setPolling(false);
        stop();
      } else if (result.status === 'failed') {
        setStatus('failed');
        setError(result.failure_reason || 'Payment failed');
        setPolling(false);
        stop();
      }
      // else: still pending, keep polling
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e.message);
    }
  }, [transactionId, reference, watchPermit, checkPermit, stop]);

  const start = useCallback(() => {
    if (intervalRef.current) return; // already polling
    setPolling(true);
    setStatus('pending');
    setError(null);
    setAttempts(0);
    setPermitId(null);

    // Immediate first poll
    poll();

    // Then poll every INTERVAL_MS
    intervalRef.current = setInterval(poll, INTERVAL_MS);
  }, [poll]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { status, permitId, polling, attempts, error, start, stop };
}
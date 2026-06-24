import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * IDAnalyzer Webhook Delivery Management.
 *
 * Two actions:
 *   action: "list"   — List recent webhook deliveries (shows which succeeded/failed)
 *   action: "retry"  — Retry (resend) a specific failed delivery by deliveryId
 *
 * IDAnalyzer API v2 endpoints (discovered):
 *   GET  https://api2.idanalyzer.com/webhook              — List webhook deliveries
 *   POST https://api2.idanalyzer.com/webhook/{deliveryId}  — Retry a webhook delivery
 *
 * The list response shape: { limit, offset, total, items: [...] }
 * Each item: { id, url, event, createdAt, lastAttempt, errorMessage, canResend }
 *
 * Requires: super_admin or bodasure_staff role.
 * Requires: IDANALYZER_API_KEY secret.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin' && user.role !== 'bodasure_staff') {
      return Response.json({ error: 'Forbidden — super_admin or bodasure_staff only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, deliveryId, limit, offset } = body;

    const apiKey = Deno.env.get('IDANALYZER_API_KEY');
    if (!apiKey) return Response.json({ error: 'IDANALYZER_API_KEY not configured' }, { status: 500 });

    // --- LIST webhook deliveries ---
    if (action === 'list' || !action) {
      const params = new URLSearchParams();
      params.set('limit', String(limit || 50));
      params.set('offset', String(offset || 0));

      const response = await fetch(`https://api2.idanalyzer.com/webhook?${params}`, {
        headers: { 'X-API-KEY': apiKey },
      });

      if (!response.ok) {
        const errText = await response.text();
        return Response.json({
          error: `IDAnalyzer API error (${response.status})`,
          details: errText.substring(0, 1000),
        }, { status: 502 });
      }

      const data = await response.json();
      const items = data.items || [];

      return Response.json({
        success: true,
        total: data.total || items.length,
        count: items.length,
        deliveries: items.map(d => ({
          id: d.id,
          event: d.event,
          url: d.url,
          errorMessage: d.errorMessage,
          canResend: d.canResend,
          createdAt: d.createdAt,
          lastAttempt: d.lastAttempt,
          failed: !!d.errorMessage,
        })),
      });
    }

    // --- RETRY a specific webhook delivery ---
    if (action === 'retry') {
      if (!deliveryId) {
        return Response.json({ error: 'deliveryId is required for retry action' }, { status: 400 });
      }

      const response = await fetch(`https://api2.idanalyzer.com/webhook/${deliveryId}`, {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      });

      const respText = await response.text();
      let data;
      try { data = JSON.parse(respText); } catch { data = { raw: respText }; }

      if (!response.ok) {
        return Response.json({
          success: false,
          error: `IDAnalyzer retry failed (${response.status}): ${data.error?.message || data.raw || respText}`,
          deliveryId,
          statusCode: response.status,
        }, { status: 502 });
      }

      return Response.json({
        success: true,
        message: 'Webhook delivery retry initiated — IDAnalyzer will re-send to the configured webhook URL',
        deliveryId,
        data,
      });
    }

    return Response.json({ error: 'Invalid action. Use "list" or "retry".' }, { status: 400 });
  } catch (error) {
    console.error('[idAnalyzerWebhookDeliveries] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
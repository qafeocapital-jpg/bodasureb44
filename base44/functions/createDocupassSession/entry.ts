import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Creates a DocuPass hosted verification session via IDAnalyzer API v2.
 * The session handles guided ID capture (front + back) and active liveness face check.
 * Returns a URL that the frontend opens in a new tab (mobile) or iframe overlay (desktop).
 *
 * Requires secrets: IDANALYZER_API_KEY, IDANALYZER_PROFILE_ID, BASE44_APP_URL, IDANALYZER_WEBHOOK_SECRET
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { redirectUrl } = await req.json().catch(() => ({}));

    const apiKey = Deno.env.get('IDANALYZER_API_KEY');
    if (!apiKey) return Response.json({ error: 'IDANALYZER_API_KEY not configured' }, { status: 500 });
    const profileId = Deno.env.get('IDANALYZER_PROFILE_ID');
    if (!profileId || profileId.length < 20) {
      return Response.json({ error: 'IDANALYZER_PROFILE_ID is not configured or invalid. Set the full KYC Profile ID from the IDAnalyzer portal.' }, { status: 500 });
    }

    // DocuPass API v2 format: version, mode, customData, profile
    // redirect_url and webhook_url are configured in the KYC Profile (IDAnalyzer portal)
    const body = {
      version: 3,
      mode: 0, // 0 = ID verification + Face verification
      customData: user.id, // Correlates webhook results back to this user
      profile: profileId,
    };

    console.log('[createDocupassSession] Creating session for user:', user.id);

    const response = await fetch('https://api2.idanalyzer.com/docupass', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errMsg = data.error?.message || data.message || 'Failed to create DocuPass session';
      console.error('[createDocupassSession] API error:', errMsg);
      return Response.json({ error: errMsg }, { status: 500 });
    }

    console.log('[createDocupassSession] Session created:', data.url);

    // Increment attempt count on user
    try {
      await base44.auth.updateMe({
        docupass_attempt_count: (user.docupass_attempt_count || 0) + 1,
      });
    } catch (e) {
      console.warn('[createDocupassSession] Failed to increment attempt count:', e.message);
    }

    return Response.json({ url: data.url, docupassId: data.id });
  } catch (error) {
    console.error('createDocupassSession error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
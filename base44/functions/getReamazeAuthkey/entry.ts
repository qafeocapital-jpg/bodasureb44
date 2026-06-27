import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = Deno.env.get('REAMAZE_SSO_SECRET');
    if (!secret) {
      return Response.json({ error: 'SSO secret not configured' }, { status: 500 });
    }

    // Reamaze authkey = HMAC-SHA256(secret, userId:email)
    const message = `${user.id}:${user.email}`;
    const keyData = new TextEncoder().encode(secret);
    const msgData = new TextEncoder().encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const authkey = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return Response.json({
      authkey,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name || '',
        phone: user.phone || '',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
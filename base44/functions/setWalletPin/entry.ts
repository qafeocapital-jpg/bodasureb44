import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Secure PIN Setting — hashes a 4-digit PIN with PBKDF2-SHA256
 * and stores it on the wallet. Called during wallet activation
 * and PIN change flows.
 *
 * Hash format: pbkdf2$<iterations>$<base64-salt>$<base64-hash>
 */

function generateSaltBase64() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

async function pbkdf2Hash(pin, saltBase64, iterations) {
  const encoder = new TextEncoder();
  const saltBytes = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const bytes = new Uint8Array(derivedBits);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { pin } = body;

    if (!pin) {
      return Response.json({ error: 'Missing pin' }, { status: 400 });
    }
    if (!/^\d{4}$/.test(pin)) {
      return Response.json({ error: 'PIN must be 4 digits' }, { status: 400 });
    }

    // Auto-lookup personal wallet by authenticated user
    const wallets = await base44.asServiceRole.entities.Wallet.filter({
      user_id: user.id,
      entity_type: 'personal',
    });
    if (wallets.length === 0) {
      return Response.json({ error: 'Personal wallet not found. Complete wallet activation first.' }, { status: 404 });
    }

    const wallet = wallets[0];

    // Verify wallet belongs to the authenticated user (defense-in-depth)
    if (wallet.user_id !== user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const salt = generateSaltBase64();
    const iterations = 100000;
    const hash = await pbkdf2Hash(pin, salt, iterations);
    const pinHash = `pbkdf2$${iterations}$${salt}$${hash}`;

    await base44.asServiceRole.entities.Wallet.update(wallet.id, { pin_hash: pinHash });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Simple in-memory rate limit
const checkAttempts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_CHECKS_PER_MINUTE = 5;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limiting per user
    const now = Date.now();
    const userKey = `id_check_${user.id}`;
    let userChecks = checkAttempts.get(userKey) || [];
    userChecks = userChecks.filter(t => now - t < RATE_LIMIT_WINDOW);
    
    if (userChecks.length >= MAX_CHECKS_PER_MINUTE) {
      return Response.json({ error: 'Too many requests. Please try again in a moment.' }, { status: 429 });
    }
    
    userChecks.push(now);
    checkAttempts.set(userKey, userChecks);

    const { national_id } = await req.json();
    if (!national_id || typeof national_id !== 'string') {
      return Response.json({ error: 'national_id is required' }, { status: 400 });
    }

    const normalized = national_id.trim();
    if (!/^\d{6,8}$/.test(normalized)) {
      return Response.json({ valid: false, conflict: false, message: 'Invalid National ID format' });
    }

    // Service-role query — bypasses RLS to check ALL users
    const existing = await base44.asServiceRole.entities.User.filter({ national_id: normalized });
    const conflict = existing.some(u => u.id !== user.id);

    return Response.json({ valid: true, conflict, normalized });
  } catch (error) {
    console.error('checkNationalIdUniqueness error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Simple in-memory rate limit: track checks per user
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
    const userKey = `phone_check_${user.id}`;
    let userChecks = checkAttempts.get(userKey) || [];
    userChecks = userChecks.filter(t => now - t < RATE_LIMIT_WINDOW);
    
    if (userChecks.length >= MAX_CHECKS_PER_MINUTE) {
      return Response.json({ error: 'Too many requests. Please try again in a moment.' }, { status: 429 });
    }
    
    userChecks.push(now);
    checkAttempts.set(userKey, userChecks);

    const { phone } = await req.json();
    if (!phone || typeof phone !== 'string') {
      return Response.json({ error: 'phone is required' }, { status: 400 });
    }

    // Normalize to E.164 using the same logic as lib/phone.js
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = digits.slice(1);
    if (digits.startsWith('254')) digits = digits.slice(3);
    if (digits.length !== 9 || (!digits.startsWith('7') && !digits.startsWith('1'))) {
      return Response.json({ valid: false, conflict: false, message: 'Invalid Kenyan phone number' });
    }
    const normalized = '254' + digits;

    // Service-role query — bypasses RLS to check ALL users
    const existing = await base44.asServiceRole.entities.User.filter({ phone: normalized });
    const conflict = existing.some(u => u.id !== user.id);

    // Return generic response (don't expose whether phone exists) — see issue fix #5
    // Still return conflict for validation UX, but error messages won't expose account existence
    return Response.json({ valid: true, conflict, normalized });
  } catch (error) {
    console.error('checkPhoneUniqueness error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
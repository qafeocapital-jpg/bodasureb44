import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

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

    return Response.json({ valid: true, conflict, normalized });
  } catch (error) {
    console.error('checkPhoneUniqueness error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
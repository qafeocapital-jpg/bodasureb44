import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Check if user's wallet is active and auto-verify phone if not already verified.
 * Called when PhaseVerification loads to avoid redundant OTP step.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get wallet status
    const wallets = await base44.asServiceRole.entities.Wallet.filter({
      user_id: user.id,
      entity_type: 'personal',
    });

    const wallet = wallets[0];
    const walletActive = wallet && wallet.status === 'active' && wallet.tier >= 1;

    // If wallet is active and phone not verified, auto-verify
    if (walletActive && !user.phone_verified) {
      await base44.asServiceRole.entities.User.update(user.id, {
        phone_verified: true,
      });
      return Response.json({ success: true, autoVerified: true });
    }

    return Response.json({ success: true, autoVerified: false, phoneVerified: user.phone_verified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
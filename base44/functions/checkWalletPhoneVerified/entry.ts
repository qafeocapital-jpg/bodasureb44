import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Check if user's wallet is active and auto-verify phone if not already verified.
 * H6 fix: Require explicit OTP token instead of trusting wallet status alone.
 * Called when PhaseVerification loads to avoid redundant OTP step.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Parse body for optional otp_token (if provided during explicit OTP step)
    let body = {};
    try {
      body = await req.json();
    } catch {}
    
    const otpToken = body.otp_token;

    // Get wallet status
    const wallets = await base44.asServiceRole.entities.Wallet.filter({
      user_id: user.id,
      entity_type: 'personal',
    });

    const wallet = wallets[0];
    const walletActive = wallet && wallet.status === 'active' && wallet.tier >= 1;

    // H6 fix: Only auto-verify if:
    // 1. Wallet is active AND
    // 2. Phone already verified OR otp_token provided
    if (walletActive && (user.phone_verified || otpToken)) {
      if (!user.phone_verified) {
        await base44.asServiceRole.entities.User.update(user.id, {
          phone_verified: true,
        });
      }
      return Response.json({ success: true, autoVerified: true });
    }

    return Response.json({ success: true, autoVerified: false, phoneVerified: user.phone_verified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
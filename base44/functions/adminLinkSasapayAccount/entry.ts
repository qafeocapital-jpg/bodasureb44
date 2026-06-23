import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return Response.json({ error: 'Forbidden — super_admin only' }, { status: 403 });

    const { userId } = await req.json().catch(() => ({}));
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });

    const targetUser = await base44.asServiceRole.entities.User.get(userId);
    if (!targetUser) return Response.json({ error: 'User not found' }, { status: 404 });
    if (!targetUser.phone) return Response.json({ error: 'User has no phone number — cannot search SasaPay' }, { status: 400 });

    let phoneDigits = (targetUser.phone || '').replace(/\D/g, '');
    if (phoneDigits.startsWith('0')) phoneDigits = phoneDigits.slice(1);
    if (phoneDigits.startsWith('254')) phoneDigits = phoneDigits.slice(3);
    const localPhone = phoneDigits;

    if (!localPhone) return Response.json({ error: 'Invalid phone number' }, { status: 400 });

    const env = Deno.env.get('SASAPAY_ENVIRONMENT') || 'sandbox';
    const clientId = Deno.env.get('SASAPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('SASAPAY_CLIENT_SECRET');
    const merchantCode = Deno.env.get('SASAPAY_MERCHANT_CODE');

    const authRes = await fetch(`https://${env}.sasapay.app/api/v1/auth/token/?grant_type=client_credentials`, {
      headers: { 'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}` }
    });
    const authData = await authRes.json();
    const token = authData.access_token;
    if (!token) return Response.json({ error: 'Failed to authenticate with SasaPay' }, { status: 500 });

    // Page through ALL customer records — no cap
    let totalPages = 1;
    let page = 1;
    let foundAccount = null;
    let foundStatus = 'ACTIVE';
    let totalScanned = 0;

    while (page <= totalPages) {
      const listRes = await fetch(`https://${env}.sasapay.app/api/v2/waas/customers/?merchant_code=${encodeURIComponent(merchantCode)}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const listData = await listRes.json();
      if (page === 1) totalPages = listData.pages || 1;

      const customers = listData.results?.customers || [];
      totalScanned += customers.length;

      for (const c of customers) {
        const mobile = (c.client?.mobile_number || '').replace(/\D/g, '').replace(/^0/, '').replace(/^254/, '');
        if (mobile && (mobile === localPhone || mobile.endsWith(localPhone) || localPhone.endsWith(mobile))) {
          foundAccount = String(c.account_number || '');
          foundStatus = c.account_status || c.client?.account_status || 'ACTIVE';
          break;
        }
      }
      if (foundAccount) break;
      page++;
    }

    if (!foundAccount) {
      return Response.json({
        success: false,
        message: `No SasaPay account found for phone ${targetUser.phone}. Scanned ${totalScanned} customers across ${page - 1} pages.`,
      });
    }

    // Fetch account status from customer-details endpoint
    try {
      const detailsRes = await fetch(`https://${env}.sasapay.app/api/v2/waas/customer-details/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ merchantCode, accountNumber: foundAccount, countryCode: '254' }),
      });
      const detailsData = await detailsRes.json();
      if (detailsData.data?.profile?.account_status) {
        foundStatus = detailsData.data.profile.account_status;
      }
    } catch { /* default to foundStatus */ }

    // Update the BodaSure Wallet
    const wallets = await base44.asServiceRole.entities.Wallet.filter({
      user_id: userId,
      entity_type: 'personal',
    });

    if (wallets.length === 0) {
      return Response.json({ error: 'No BodaSure wallet found for this user' }, { status: 404 });
    }

    await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
      sasapay_customer_id: foundAccount,
      sasapay_account_number: foundAccount,
      sasapay_account_status: foundStatus,
      tier: 1,
      status: 'active',
    });

    // Update user wallet_tier
    await base44.asServiceRole.entities.User.update(userId, { wallet_tier: 1 });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      action: 'admin_link_sasapay_account',
      entity_type: 'Wallet',
      entity_id: wallets[0].id,
      description: `Admin ${user.full_name} linked SasaPay account ${foundAccount} to user ${targetUser.full_name} (${userId})`,
      new_values: {
        sasapay_account_number: foundAccount,
        sasapay_account_status: foundStatus,
        tier: 1,
        status: 'active',
      },
    });

    return Response.json({
      success: true,
      accountNumber: foundAccount,
      accountStatus: foundStatus,
      message: `Successfully linked SasaPay account ${foundAccount}`,
    });
  } catch (error) {
    console.error('adminLinkSasapayAccount error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
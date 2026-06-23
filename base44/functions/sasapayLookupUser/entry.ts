import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone } = await req.json().catch(() => ({ phone: user.phone }));

    const env = Deno.env.get('SASAPAY_ENVIRONMENT') || 'sandbox';
    const clientId = Deno.env.get('SASAPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('SASAPAY_CLIENT_SECRET');
    const merchantCode = Deno.env.get('SASAPAY_MERCHANT_CODE');

    // Get token
    const authRes = await fetch(`https://${env}.sasapay.app/api/v1/auth/token/?grant_type=client_credentials`, {
      headers: { 'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}` }
    });
    const authData = await authRes.json();
    const token = authData.access_token;

    // Page through ALL customer records and find by phone
    let allCustomers = [];
    let totalPages = 1;
    let page = 1;
    while (page <= totalPages) {
      const listRes = await fetch(`https://${env}.sasapay.app/api/v2/waas/customers/?merchant_code=${encodeURIComponent(merchantCode)}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const listData = await listRes.json();
      if (page === 1) totalPages = listData.pages || 1;
      const customers = listData.results?.customers || [];
      allCustomers = allCustomers.concat(customers.map(c => ({
        page,
        account_number: c.account_number,
        mobile: c.client?.mobile_number,
        display_name: c.client?.display_name,
        account_status: c.account_status || c.client?.account_status
      })));
      page++;
    }

    // Match by phone digits
    const localPhone = (phone || '').replace(/\D/g, '').replace(/^0/, '').replace(/^254/, '');
    const matched = allCustomers.filter(c => {
      const mobile = (c.mobile || '').replace(/\D/g, '').replace(/^0/, '').replace(/^254/, '');
      return mobile && (mobile === localPhone || mobile.endsWith(localPhone) || localPhone.endsWith(mobile));
    });

    return Response.json({
      searched_phone_local: localPhone,
      total_pages: totalPages,
      total_customers_scanned: allCustomers.length,
      matched_customers: matched,
      all_customers_preview: allCustomers.slice(0, 5)
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});
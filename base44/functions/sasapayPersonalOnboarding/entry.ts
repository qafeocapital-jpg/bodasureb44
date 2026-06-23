import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, otp, requestId } = await req.json();

    if (!action || !['init', 'confirm'].includes(action)) {
      return Response.json({ error: 'Action must be "init" or "confirm"' }, { status: 400 });
    }

    if (action === 'init') {
      return await initializePersonalOnboarding(base44, user);
    } else {
      if (!otp || !requestId) {
        return Response.json({ error: 'otp and requestId required for confirm' }, { status: 400 });
      }
      return await confirmPersonalOnboarding(base44, user, otp, requestId);
    }
  } catch (error) {
    console.error('sasapayPersonalOnboarding error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function initializePersonalOnboarding(base44, user) {
  // Validate required user fields
  if (!user.full_name || !user.phone || !user.national_id) {
    throw new Error('Missing required fields: full_name, phone, national_id');
  }

  const merchantCode = Deno.env.get('SASAPAY_MERCHANT_CODE');
  const token = await getSasaPayToken();

  // Parse name into parts
  const nameParts = user.full_name.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts[nameParts.length - 1] || '';
  const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

  // Extract country code and format mobile
  const countryCode = '254';
  const mobileNumber = user.phone.replace(/^0/, '254').replace(/^254/, '254');

  // Determine document type from stored value (default to 1 for ID card)
  const docTypeMap = { id_card: '1', passport: '2', alien_id: '3' };
  const documentType = docTypeMap[user.document_type] || '1';

  const payload = {
    merchantCode,
    firstName,
    middleName,
    lastName,
    countryCode,
    mobileNumber,
    documentNumber: user.national_id,
    documentType,
    email: user.email || `rider-${user.id}@bodasure.local`,
    callbackUrl: `${getBaseUrl()}/functions/invoke/sasapayPersonalOnboardingCallback`,
  };

  const response = await fetch(
    `${getSasaPayApiUrl()}/waas/personal-onboarding/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (data.responseCode !== '0') {
    throw new Error(`SasaPay init failed: ${data.message}`);
  }

  // Store requestId on wallet
  const wallets = await base44.asServiceRole.entities.Wallet.filter({
    user_id: user.id,
    entity_type: 'personal',
  });

  if (wallets.length > 0) {
    await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
      sasapay_request_id: data.requestId,
    });
  }

  return Response.json({
    success: true,
    requestId: data.requestId,
    message: data.message,
  });
}

async function confirmPersonalOnboarding(base44, user, otp, requestId) {
  const merchantCode = Deno.env.get('SASAPAY_MERCHANT_CODE');
  const token = await getSasaPayToken();

  const payload = {
    merchantCode,
    otp,
    requestId,
  };

  const response = await fetch(
    `${getSasaPayApiUrl()}/waas/personal-onboarding/confirmation/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (data.responseCode !== '0') {
    throw new Error(`SasaPay confirmation failed: ${data.message}`);
  }

  // Store account details on wallet
  const wallets = await base44.asServiceRole.entities.Wallet.filter({
    user_id: user.id,
    entity_type: 'personal',
  });

  if (wallets.length > 0) {
    await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
      sasapay_customer_id: data.data?.accountNumber,
      sasapay_account_number: data.data?.accountNumber,
      sasapay_account_status: data.data?.accountStatus || 'PENDING',
    });
  }

  // Create audit log
  await base44.asServiceRole.entities.AuditLog.create({
    user_id: user.id,
    action: 'sasapay_personal_onboarding_confirmed',
    entity_type: 'Wallet',
    entity_id: wallets.length > 0 ? wallets[0].id : '',
    description: `SasaPay personal account created: ${data.data?.accountNumber}`,
    new_values: {
      sasapay_account_number: data.data?.accountNumber,
      sasapay_account_status: data.data?.accountStatus,
    },
  });

  return Response.json({
    success: true,
    accountNumber: data.data?.accountNumber,
    displayName: data.data?.displayName,
    accountStatus: data.data?.accountStatus,
    message: data.message,
  });
}

async function getSasaPayToken() {
  const clientId = Deno.env.get('SASAPAY_CLIENT_ID');
  const clientSecret = Deno.env.get('SASAPAY_CLIENT_SECRET');
  const env = Deno.env.get('SASAPAY_ENVIRONMENT') || 'sandbox';

  const authUrl = `https://${env}.sasapay.app/oauth/token/`;

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
  });

  const data = await response.json();
  return data.access_token;
}

function getSasaPayApiUrl() {
  const env = Deno.env.get('SASAPAY_ENVIRONMENT') || 'sandbox';
  return `https://${env}.sasapay.app/api/v2`;
}

function getBaseUrl() {
  return Deno.env.get('BASE44_APP_URL') || 'https://bodasure.local';
}
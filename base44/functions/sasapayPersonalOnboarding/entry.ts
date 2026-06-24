import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, otp, requestId } = await req.json();

    if (!action || !['init', 'confirm', 'resendOtp'].includes(action)) {
      return Response.json({ error: 'Action must be "init", "confirm", or "resendOtp"' }, { status: 400 });
    }

    if (action === 'init') {
      return await initializePersonalOnboarding(base44, user);
    } else if (action === 'resendOtp') {
      if (!requestId) {
        return Response.json({ error: 'requestId required for resendOtp' }, { status: 400 });
      }
      return await resendPersonalOtp(base44, user, requestId);
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

  // Normalize phone to E.164 (254XXXXXXXXX)
  let phoneDigits = (user.phone || '').replace(/\D/g, '');
  if (phoneDigits.startsWith('0')) phoneDigits = phoneDigits.slice(1);
  if (phoneDigits.startsWith('254')) phoneDigits = phoneDigits.slice(3);
  const normalizedPhone = '254' + phoneDigits;

  // Server-side phone uniqueness check (defense-in-depth against client bypass)
  const existingUsers = await base44.asServiceRole.entities.User.filter({ phone: normalizedPhone });
  if (existingUsers.some(u => u.id !== user.id)) {
    // Log onboarding error
    await logOnboardingError(base44, user, 'duplicate_phone', 'Phone number already in use.', normalizedPhone, user.national_id);
    return Response.json({
      success: false,
      error: 'This phone number is already in use. Please try a different one.',
      conflictType: 'phone',
    }, { status: 400 });
  }

  // Server-side national_id uniqueness check (NEW)
  const existingIdUsers = await base44.asServiceRole.entities.User.filter({ national_id: user.national_id });
  if (existingIdUsers.some(u => u.id !== user.id)) {
    // Log onboarding error
    await logOnboardingError(base44, user, 'duplicate_id', 'ID number already in use.', normalizedPhone, user.national_id);
    return Response.json({
      success: false,
      error: 'This ID number is already in use. Please verify your details.',
      conflictType: 'national_id',
    }, { status: 400 });
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
  const mobileNumber = normalizedPhone;

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

  const respText = await response.text();
  let data;
  try {
    data = JSON.parse(respText);
  } catch {
    throw new Error(`SasaPay init returned non-JSON (HTTP ${response.status}). Check credentials.`);
  }

  if (data.responseCode !== '0') {
    console.error('[init] SasaPay non-success response:', JSON.stringify(data));
    // Recovery: user already has a SasaPay wallet from a prior partial attempt
    // (e.g. confirm succeeded but wallet update failed). Look up the existing
    // account and fast-track them to PIN setup — no OTP needed.
    const errMsg = (data.message || '').toLowerCase();
    const shouldRecover = errMsg.includes('already has a wallet') || errMsg.includes('already exists');
    if (shouldRecover) {
      const recovered = await recoverExistingSasaPayAccount(base44, user, token);
      if (recovered) {
        return Response.json({
          success: true,
          recovered: true,
          requestId: 'recovered',
          accountNumber: recovered.accountNumber,
          message: 'Your BodaSure Wallet account already exists. Set your PIN to continue.',
        });
      }
      // Recovery failed — log the error and return structured error
      await logOnboardingError(base44, user, 'recovery_failed', 'Account recovery failed. Contact support.', normalizedPhone, user.national_id);
      return Response.json({
        success: false,
        error: 'We encountered an issue. Please contact support with your phone number.',
        conflictType: 'unknown',
      }, { status: 400 });
    }
    // Map SasaPay errors to BodaSure-branded messages
    const errorMap = {
      'sp4000': 'Account already exists',
      'sp4001': 'Invalid phone number',
      'sp4002': 'Invalid ID number',
    };
    const mappedError = Object.keys(errorMap).find(code => errMsg.includes(code.replace('sp', '')))
      ? errorMap[Object.keys(errorMap).find(code => errMsg.includes(code.replace('sp', '')))]
      : 'Wallet activation failed';
    
    // Log SasaPay error
    await logOnboardingError(base44, user, 'sasapay_error', mappedError, normalizedPhone, user.national_id);
    return Response.json({
      success: false,
      error: 'We encountered an issue during wallet activation. Please try again.',
      conflictType: 'unknown',
    }, { status: 400 });
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
  } else {
    // No wallet found — log warning but still return success
    // The wallet will be created at confirm time
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      action: 'wallet_not_found_on_init',
      entity_type: 'Wallet',
      description: 'SasaPay init succeeded but no personal wallet found to store requestId. Will be created at confirm step.',
      new_values: { sasapay_request_id: data.requestId },
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

  const respText = await response.text();
  let data;
  try {
    data = JSON.parse(respText);
  } catch {
    throw new Error(`SasaPay confirmation returned non-JSON (HTTP ${response.status}). Check credentials.`);
  }

  if (data.responseCode !== '0') {
    throw new Error(`SasaPay confirmation failed: ${data.message}`);
  }

  // Store account details on wallet
  let wallets = await base44.asServiceRole.entities.Wallet.filter({
    user_id: user.id,
    entity_type: 'personal',
  });

  // FIX 1: SasaPay returns accountNumber as an integer, but the Wallet entity
  // schema requires a string. Coerce to string to prevent 422 validation errors.
  const accountNumberStr = data.data?.accountNumber != null ? String(data.data.accountNumber) : '';
  const accountStatus = data.data?.accountStatus || 'PENDING';

  if (wallets.length === 0) {
    // Create personal wallet if missing (edge case: init succeeded but wallet wasn't found)
    const wallet = await base44.asServiceRole.entities.Wallet.create({
      user_id: user.id,
      entity_type: 'personal',
      sasapay_customer_id: accountNumberStr,
      sasapay_account_number: accountNumberStr,
      sasapay_account_status: accountStatus,
      tier: 1,
      status: 'active',
    });
    wallets = [wallet];
  } else {
    // Update existing wallet
    await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
      sasapay_customer_id: accountNumberStr,
      sasapay_account_number: accountNumberStr,
      sasapay_account_status: accountStatus,
      tier: 1,
      status: 'active',
    });
  }

  // Create audit log
  await base44.asServiceRole.entities.AuditLog.create({
    user_id: user.id,
    action: 'sasapay_personal_onboarding_confirmed',
    entity_type: 'Wallet',
    entity_id: wallets.length > 0 ? wallets[0].id : '',
    description: `SasaPay personal account created: ${accountNumberStr}`,
    new_values: {
      sasapay_account_number: accountNumberStr,
      sasapay_account_status: accountStatus,
    },
  });

  return Response.json({
    success: true,
    accountNumber: accountNumberStr,
    displayName: data.data?.displayName,
    accountStatus: accountStatus,
    message: data.message,
  });
}

async function getSasaPayToken() {
  const clientId = Deno.env.get('SASAPAY_CLIENT_ID');
  const clientSecret = Deno.env.get('SASAPAY_CLIENT_SECRET');
  const env = Deno.env.get('SASAPAY_ENVIRONMENT') || 'sandbox';

  const authUrl = `https://${env}.sasapay.app/api/v1/auth/token/?grant_type=client_credentials`;
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(authUrl, {
    method: 'GET',
    headers: { 'Authorization': `Basic ${credentials}` },
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`SasaPay auth returned non-JSON (HTTP ${response.status}). Check credentials.`);
  }
  if (!data.access_token) {
    throw new Error(`SasaPay auth failed: ${data.detail || data.error || text.substring(0, 200)}`);
  }
  return data.access_token;
}

function getSasaPayApiUrl() {
  const env = Deno.env.get('SASAPAY_ENVIRONMENT') || 'sandbox';
  return `https://${env}.sasapay.app/api/v2`;
}

async function resendPersonalOtp(base44, user, requestId) {
  // SasaPay uses re-init to generate a new OTP: calling the init endpoint
  // again with the same user data produces a new requestId + OTP.
  return await initializePersonalOnboarding(base44, user);
}

async function logOnboardingError(base44, user, errorCode, errorMessage, phone, nationalId) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      action: 'wallet_onboarding_failed',
      entity_type: 'Wallet',
      description: `Onboarding error: ${errorCode}`,
      new_values: {
        error_code: errorCode,
        error_message: errorMessage,
        phone,
        national_id: nationalId,
        conflict_type: errorCode === 'duplicate_phone' ? 'phone' : errorCode === 'duplicate_id' ? 'national_id' : 'unknown',
      },
    });
  } catch (e) {
    console.warn('Failed to log onboarding error:', e.message);
  }
}

/**
 * FIX 2: Recovery path — when SasaPay says "User already has a wallet with
 * this merchant", the account was created in a prior attempt but the BodaSure
 * wallet record was never updated (e.g. confirm returned an integer
 * accountNumber that failed validation). This looks up the existing SasaPay
 * customer via the Get Customers endpoint, matches by phone or name, then
 * updates the wallet to tier 1 / active so the user can proceed to set PIN.
 */
async function recoverExistingSasaPayAccount(base44, user, token) {
  const merchantCode = Deno.env.get('SASAPAY_MERCHANT_CODE');
  const nameParts = user.full_name.trim().split(/\s+/);
  const firstName = (nameParts[0] || '').toLowerCase();
  const lastName = (nameParts[nameParts.length - 1] || '').toLowerCase();

  let phoneDigits = (user.phone || '').replace(/\D/g, '');
  if (phoneDigits.startsWith('0')) phoneDigits = phoneDigits.slice(1);
  if (phoneDigits.startsWith('254')) phoneDigits = phoneDigits.slice(3);
  const localPhone = phoneDigits; // 9 digits e.g. 712345678

  // Page through the merchant's customer list and match by phone or name.
  // SasaPay returns links.next with http:// (not https://) which causes auth
  // failures on redirects, so we construct page URLs manually with HTTPS.
  const baseUrl = `${getSasaPayApiUrl()}/waas/customers/?merchant_code=${encodeURIComponent(merchantCode)}`;
  let total_pages = 1;
  let page = 1;

  while (page <= total_pages && page <= 10) {
    let listData;
    try {
      const listRes = await fetch(`${baseUrl}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      listData = JSON.parse(await listRes.text());
    } catch (listErr) {
      break;
    }

    // Update total pages from the first response
    if (page === 1 && listData.pages) {
      total_pages = listData.pages;
    }

    const customers = listData.results?.customers || [];
    for (const c of customers) {
      const displayName = (c.client?.display_name || '').toLowerCase();
      const mobile = (c.client?.mobile_number || '').replace(/\D/g, '');
      const phoneMatch = mobile && (
        mobile === localPhone ||
        mobile.endsWith(localPhone) ||
        localPhone.endsWith(mobile)
      );
      const nameMatch = firstName && lastName &&
        displayName.includes(firstName) && displayName.includes(lastName);

      if (phoneMatch || nameMatch) {
        const accountNumber = String(c.account_number || '');
        if (!accountNumber) continue;

        // Fetch the account status from the customer-details endpoint
        let accountStatus = 'ACTIVE';
        try {
          const detailsRes = await fetch(`${getSasaPayApiUrl()}/waas/customer-details/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              merchantCode,
              accountNumber,
              countryCode: '254',
            }),
          });
          const detailsData = JSON.parse(await detailsRes.text());
          if (detailsData.data?.profile?.account_status) {
            accountStatus = detailsData.data.profile.account_status;
          }
        } catch { /* default to ACTIVE */ }

        // Update the BodaSure wallet with recovered details
        const wallets = await base44.asServiceRole.entities.Wallet.filter({
          user_id: user.id,
          entity_type: 'personal',
        });
        if (wallets.length > 0) {
          await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
            sasapay_customer_id: accountNumber,
            sasapay_account_number: accountNumber,
            sasapay_account_status: accountStatus,
            tier: 1,
            status: 'active',
          });

          await base44.asServiceRole.entities.AuditLog.create({
            user_id: user.id,
            action: 'sasapay_personal_onboarding_recovered',
            entity_type: 'Wallet',
            entity_id: wallets[0].id,
            description: `SasaPay personal account recovered after partial failure: ${accountNumber}`,
            new_values: {
              sasapay_account_number: accountNumber,
              sasapay_account_status: accountStatus,
              tier: 1,
              status: 'active',
            },
          });
        }

        return { accountNumber, accountStatus };
      }
    }

    page++;
  }

  return null;
}
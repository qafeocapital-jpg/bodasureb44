/**
 * sasapayPersonalOnboarding — Personal wallet activation (SasaPay WAAS)
 *
 * FUNCTION MAP:
 *   Deno.serve handler        — routes by action: init | confirm | resendOtp
 *   initializePersonalOnboarding — validates user fields, checks phone/ID uniqueness,
 *                                 calls SasaPay init API, stores requestId on Wallet
 *   confirmPersonalOnboarding  — calls SasaPay OTP confirmation, creates/updates Wallet,
 *                                 locks in user-entered name via service-role write
 *   resendPersonalOtp          — re-calls initializePersonalOnboarding to generate new OTP
 *   getSasaPayToken            — OAuth2 client_credentials token fetch
 *   getSasaPayApiUrl           — returns SasaPay API base URL based on environment
 *   logOnboardingError         — writes failed onboarding attempts to AuditLog for Admin dashboard
 *
 * READS:  User, Wallet
 * WRITES: Wallet, AuditLog, User (name lock-in)
 *
 * CONTRACT: See FEATURE_CONTRACTS.md — PhasePersonal → sasapayPersonalOnboarding
 */
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

// ============================================================
// SECTION: initializePersonalOnboarding
// Validates user fields, normalizes phone, checks phone/ID uniqueness,
// calls SasaPay personal-onboarding init API, stores requestId on Wallet.
// Hard-blocks on duplicate phone, ID, or existing SasaPay wallet.
// ============================================================
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
    // Hard-block: wallet already exists for this phone/ID in SasaPay
    const errMsg = (data.message || '').toLowerCase();
    const isDuplicate = errMsg.includes('already has a wallet') || errMsg.includes('already exists');
    if (isDuplicate) {
      // Log the blocked attempt for Admin dashboard
      await logOnboardingError(base44, user, 'duplicate_sasapay_wallet', 'Wallet already exists in SasaPay. User must use different credentials.', normalizedPhone, user.national_id);
      return Response.json({
        success: false,
        error: 'This phone number is already registered with BodaSure Wallet. Please use a different phone number or contact support.',
        conflictType: 'phone_exists_in_sasapay',
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

// ============================================================
// SECTION: confirmPersonalOnboarding
// Calls SasaPay OTP confirmation, creates/updates Wallet with account details,
// coerces accountNumber to string, performs name lock-in via service-role write.
// ============================================================
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
    return Response.json({
      success: false,
      error: data.message || 'OTP verification failed. Check your code and try again.',
    }, { status: 400 });
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

  // Second lock-in: re-write full_name and middle_name via service-role to prevent
  // OAuth token refresh from clobbering the user-entered name on subsequent auth.me() calls
  try {
    await base44.asServiceRole.entities.User.update(user.id, {
      full_name: user.full_name,
      middle_name: user.middle_name || '',
    });
  } catch (e) {
    console.warn('[confirm] Failed to re-write user name:', e.message);
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

// ============================================================
// SECTION: getSasaPayToken
// Fetches OAuth2 access token using client_credentials grant.
// ============================================================
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

// ============================================================
// SECTION: getSasaPayApiUrl
// Returns SasaPay API v2 base URL based on SASAPAY_ENVIRONMENT.
// ============================================================
function getSasaPayApiUrl() {
  const env = Deno.env.get('SASAPAY_ENVIRONMENT') || 'sandbox';
  return `https://${env}.sasapay.app/api/v2`;
}

// ============================================================
// SECTION: resendPersonalOtp
// SasaPay generates a new OTP by re-calling the init endpoint
// with the same user data. Returns a new requestId + OTP.
// ============================================================
async function resendPersonalOtp(base44, user, requestId) {
  // SasaPay uses re-init to generate a new OTP: calling the init endpoint
  // again with the same user data produces a new requestId + OTP.
  return await initializePersonalOnboarding(base44, user);
}

// ============================================================
// SECTION: logOnboardingError
// Writes failed onboarding attempts to AuditLog for Admin dashboard visibility.
// Called on: duplicate_phone, duplicate_id, duplicate_sasapay_wallet, sasapay_error
// ============================================================
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
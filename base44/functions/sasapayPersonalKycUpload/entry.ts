import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { passportSizePhotoUrl, documentImageFrontUrl, documentImageBackUrl } = await req.json();

    if (!passportSizePhotoUrl || !documentImageFrontUrl || !documentImageBackUrl) {
      return Response.json({ 
        error: 'Missing required file URLs: passportSizePhotoUrl, documentImageFrontUrl, documentImageBackUrl' 
      }, { status: 400 });
    }

    const merchantCode = Deno.env.get('SASAPAY_MERCHANT_CODE');
    const token = await getSasaPayToken();

    // Get wallet to retrieve customer mobile number
    const wallets = await base44.asServiceRole.entities.Wallet.filter({
      user_id: user.id,
      entity_type: 'personal',
    });

    if (wallets.length === 0 || !wallets[0].sasapay_account_number) {
      throw new Error('No active SasaPay account found. Complete onboarding first.');
    }

    // Download files from URLs and create multipart form
    const [passportFile, frontFile, backFile] = await Promise.all([
      downloadFile(passportSizePhotoUrl),
      downloadFile(documentImageFrontUrl),
      downloadFile(documentImageBackUrl),
    ]);

    // Normalize phone to E.164 (254XXXXXXXXX) for SasaPay
    let phoneDigits = (user.phone || '').replace(/\D/g, '');
    if (phoneDigits.startsWith('0')) phoneDigits = phoneDigits.slice(1);
    if (phoneDigits.startsWith('254')) phoneDigits = phoneDigits.slice(3);
    const normalizedPhone = '254' + phoneDigits;

    // Create FormData with files
    const formData = new FormData();
    formData.append('merchantCode', merchantCode);
    formData.append('customerMobileNumber', normalizedPhone);
    formData.append('passportSizePhoto', passportFile, 'selfie.jpg');
    formData.append('documentImageFront', frontFile, 'id_front.jpg');
    formData.append('documentImageBack', backFile, 'id_back.jpg');

    const response = await fetch(
      `${getSasaPayApiUrl()}/waas/personal-onboarding/kyc/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const respText = await response.text();
    let data;
    try {
      data = JSON.parse(respText);
    } catch {
      throw new Error(`SasaPay KYC upload returned non-JSON (HTTP ${response.status}). Check credentials.`);
    }

    if (data.responseCode !== '0') {
      throw new Error(`SasaPay KYC upload failed: ${data.message}`);
    }

    // Update wallet status
    await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
      sasapay_account_status: data.data?.accountStatus || 'AWAITING_KYC_UPLOAD',
      sasapay_kyc_uploaded_at: new Date().toISOString(),
    });

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      action: 'sasapay_personal_kyc_uploaded',
      entity_type: 'Wallet',
      entity_id: wallets[0].id,
      description: `SasaPay personal KYC documents uploaded. Status: ${data.data?.accountStatus}`,
      new_values: {
        sasapay_account_status: data.data?.accountStatus,
        sasapay_kyc_uploaded_at: new Date().toISOString(),
      },
    });

    return Response.json({
      success: true,
      accountStatus: data.data?.accountStatus,
      message: data.message,
    });
  } catch (error) {
    console.error('sasapayPersonalKycUpload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function downloadFile(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download file from ${url}`);
  return new File([await response.arrayBuffer()], 'file', { type: response.headers.get('content-type') || 'image/jpeg' });
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
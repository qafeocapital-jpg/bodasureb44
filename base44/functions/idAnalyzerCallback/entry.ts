import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * IDAnalyzer DocuPass webhook handler (v2).
 *
 * Atomic flow on every docupass_conclusive event:
 *   1. Validate HMAC signature (or query-string secret fallback)
 *   2. Filter events — only process docupass_conclusive
 *   3. Upsert KycDocuments + hydrate User with extracted identity
 *   4. Push docs to SasaPay KYC (on accept, if wallet onboarded)
 *   5. SMS notification to rider
 *   6. AuditLog entries
 *
 * Returns HTTP 200 quickly for non-retryable cases; 401/500 for retryable ones.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // --- 0. Read raw body BEFORE parsing (needed for HMAC) ---
  const rawBody = await req.text();

  // --- 1. Authentication: HMAC signature (with query-secret fallback) ---
  const webhookSecret = Deno.env.get('IDANALYZER_WEBHOOK_SECRET');
  if (!webhookSecret) {
    return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const idaSignature = req.headers.get('X-IDA-Signature');
  const idaTimestamp = req.headers.get('X-IDA-Timestamp');
  const querySecret = new URL(req.url).searchParams.get('secret');

  let authenticated = false;

  if (idaSignature && idaTimestamp) {
    // HMAC verification: v1=HEX(HMAC_SHA256(secret, timestamp + '.' + rawBody))
    const expectedSig = await computeHmac(webhookSecret, `${idaTimestamp}.${rawBody}`);
    const tsNum = parseInt(idaTimestamp, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (isNaN(tsNum) || Math.abs(nowSec - tsNum) > 300) {
      console.warn('[idAnalyzerCallback] Stale or invalid timestamp, rejecting');
      return Response.json({ error: 'Stale timestamp' }, { status: 401 });
    }
    authenticated = await constantTimeEqual(expectedSig, idaSignature);
    if (!authenticated) {
      console.warn('[idAnalyzerCallback] HMAC signature mismatch, rejecting');
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else if (querySecret === webhookSecret) {
    // Backward-compat fallback for testing
    authenticated = true;
  }

  if (!authenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- Parse payload ---
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // --- 2. Event filtering ---
  const eventType = payload.event || payload.type;
  if (eventType && eventType !== 'docupass_conclusive') {
    // Idempotent 200 for non-conclusive events (new/delete/update)
    return Response.json({ success: true, message: `Ignored event: ${eventType}` });
  }

  const decision = payload.decision; // accept | review | reject
  const transactionId = payload.id || payload.transactionId;
  const customData = payload.customData;

  if (!transactionId || !decision) {
    return Response.json({ error: 'Missing required fields: id, decision' }, { status: 400 });
  }

  const statusMap = { accept: 'approved', review: 'pending', reject: 'rejected' };
  const docStatus = statusMap[decision] || 'pending';

  // --- Identify user ---
  let userId = customData;
  // Fallback: some v2 payloads nest it differently
  if (!userId && payload.reference) userId = payload.reference;
  if (!userId && payload.user_reference) userId = payload.user_reference;

  if (!userId) {
    console.warn(`[idAnalyzerCallback] No user (customData) for transaction ${transactionId}`);
    return Response.json({ success: true, message: 'No user reference, silently accepted' });
  }

  // --- Idempotency check ---
  try {
    const existing = await base44.asServiceRole.entities.KycDocument.filter({
      provider_reference: transactionId,
    });
    if (existing.length > 0 && existing.some(d => d.status === 'approved')) {
      console.log(`[idAnalyzerCallback] Transaction ${transactionId} already processed, skipping`);
      return Response.json({ success: true, message: 'Already processed' });
    }
  } catch (e) {
    console.warn('[idAnalyzerCallback] Idempotency check failed (continuing):', e.message);
  }

  // --- 3. Extract document image URLs + identity data ---
  const data = payload.data || {};
  const outputImage = payload.outputImage || {};

  const frontUrl = outputImage.front || '';
  const backUrl = outputImage.back || '';
  const faceUrl = outputImage.face || '';

  const fullName = extractValue(data.fullName);
  const dob = extractValue(data.dob);
  const documentNumber = extractValue(data.documentNumber);

  const rejectionReason = decision === 'reject'
    ? (payload.warning?.[0]?.description || payload.warning?.[0]?.message || 'Verification rejected')
    : null;

  // --- 4. BodaSure DB upsert ---
  const existingDocs = await base44.asServiceRole.entities.KycDocument.filter({ user_id: userId });
  const docTypes = [
    { type: 'id_front', url: frontUrl },
    { type: 'id_back', url: backUrl },
    { type: 'selfie', url: faceUrl },
  ];

  const upsertData = {
    status: docStatus,
    provider_name: 'idanalyzer_docupass',
    provider_reference: transactionId,
  };
  if (docStatus === 'approved') upsertData.reviewed_at = new Date().toISOString();
  if (rejectionReason) upsertData.rejection_reason = rejectionReason;

  await Promise.all(docTypes.map(async ({ type, url }) => {
    const existing = existingDocs.find(d => d.document_type === type);
    const recordData = { ...upsertData, file_url: url || (existing?.file_url || '') };
    if (existing) {
      await base44.asServiceRole.entities.KycDocument.update(existing.id, recordData);
    } else {
      await base44.asServiceRole.entities.KycDocument.create({
        user_id: userId,
        document_type: type,
        ...recordData,
      });
    }
  }));

  // --- Hydrate user identity data (store decision + face confidence always; extracted fields on accept) ---
  try {
    const user = await base44.asServiceRole.entities.User.get(userId);
    const userUpdate = { docupass_decision: decision };

    // Extract face confidence from various possible payload paths
    let faceConfidence = null;
    const faceField = data.face;
    if (faceField) {
      if (typeof faceField === 'number') faceConfidence = faceField;
      else if (Array.isArray(faceField) && faceField[0]) {
        faceConfidence = typeof faceField[0] === 'object' ? (faceField[0].confidence ?? faceField[0].value) : faceField[0];
      } else if (typeof faceField === 'object') {
        faceConfidence = faceField.confidence ?? faceField.value;
      }
    }
    if (faceConfidence != null) {
      if (faceConfidence > 1) faceConfidence = faceConfidence / 100;
      userUpdate.id_face_confidence = faceConfidence;
    }

    if (decision === 'accept') {
      if (fullName) userUpdate.id_extracted_name = fullName;
      if (dob) userUpdate.id_extracted_dob = dob;
      if (documentNumber && !user?.national_id) userUpdate.national_id = documentNumber;
    }
    await base44.asServiceRole.entities.User.update(userId, userUpdate);
  } catch (e) {
    console.warn('[idAnalyzerCallback] Failed to hydrate user:', e.message);
  }

  // --- 7a. AuditLog: DocuPass completion ---
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: userId,
      action: 'idanalyzer_docupass_completed',
      entity_type: 'KycDocument',
      description: `DocuPass verification ${decision}. Transaction: ${transactionId}`,
      new_values: { decision, transactionId, docStatus },
    });
  } catch (e) {
    console.warn('[idAnalyzerCallback] AuditLog (completion) failed:', e.message);
  }

  // --- Return 200 immediately; SasaPay + SMS are fire-and-forget ---
  const responsePayload = Response.json({ success: true, status: docStatus, decision });

  // Fire-and-forget: SasaPay push + SMS notification
  // These run after the response is returned; errors don't affect the webhook.
  const tasks = [];

  // --- 5. SasaPay auto-push (on accept only) ---
  if (decision === 'accept' && frontUrl && backUrl && faceUrl) {
    tasks.push(pushToSasapay(base44, userId, { frontUrl, backUrl, faceUrl }));
  }

  // --- 6. SMS notification ---
  tasks.push(sendKycSms(base44, userId, decision));

  // Don't await — return 200 to IDAnalyzer immediately
  Promise.allSettled(tasks).catch(() => {});

  return responsePayload;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract first value from v2 data field (array of { value }) */
function extractValue(field) {
  if (!field) return null;
  if (Array.isArray(field)) return field[0]?.value || null;
  if (typeof field === 'string') return field;
  return field.value || null;
}

/** Compute HMAC-SHA256 hex digest using Web Crypto */
async function computeHmac(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Constant-time string comparison */
async function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  const enc = new TextEncoder();
  const aBuf = enc.encode(a);
  const bBuf = enc.encode(b);
  const aHash = await crypto.subtle.digest('SHA-256', aBuf);
  const bHash = await crypto.subtle.digest('SHA-256', bBuf);
  const aArr = new Uint8Array(aHash);
  const bArr = new Uint8Array(bHash);
  let diff = 0;
  for (let i = 0; i < aArr.length; i++) diff |= aArr[i] ^ bArr[i];
  return diff === 0;
}

// ---------------------------------------------------------------------------
// SasaPay KYC push (inlined from sasapayPersonalKycUpload, service-role)
// ---------------------------------------------------------------------------

async function pushToSasapay(base44, userId, { frontUrl, backUrl, faceUrl }) {
  try {
    // (a) Find personal wallet
    const wallets = await base44.asServiceRole.entities.Wallet.filter({
      user_id: userId,
      entity_type: 'personal',
    });
    if (wallets.length === 0) {
      console.warn(`[idAnalyzerCallback] No wallet for user ${userId}, skipping SasaPay push`);
      return;
    }
    const wallet = wallets[0];

    // (b) Check wallet has sasapay_account_number
    if (!wallet.sasapay_account_number) {
      console.warn(`[idAnalyzerCallback] Wallet ${wallet.id} not onboarded to SasaPay, skipping KYC push`);
      return;
    }

    // (c) Get user phone + merchant code
    const user = await base44.asServiceRole.entities.User.get(userId);
    if (!user?.phone) {
      console.warn(`[idAnalyzerCallback] User ${userId} has no phone, cannot push to SasaPay`);
      return;
    }
    const merchantCode = Deno.env.get('SASAPAY_MERCHANT_CODE');
    if (!merchantCode) {
      console.warn('[idAnalyzerCallback] SASAPAY_MERCHANT_CODE not set, skipping push');
      return;
    }

    // (d) Fetch token + download images in parallel
    const [token, faceFile, frontFile, backFile] = await Promise.all([
      getSasapayToken(),
      downloadFile(faceUrl),
      downloadFile(frontUrl),
      downloadFile(backUrl),
    ]);

    // (e) Build multipart form
    const formData = new FormData();
    formData.append('merchantCode', merchantCode);
    formData.append('customerMobileNumber', user.phone);
    formData.append('passportSizePhoto', faceFile, 'selfie.jpg');
    formData.append('documentImageFront', frontFile, 'id_front.jpg');
    formData.append('documentImageBack', backFile, 'id_back.jpg');

    const response = await fetch(`${getSasapayApiUrl()}/waas/personal-onboarding/kyc/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    const respText = await response.text();
    let data;
    try {
      data = JSON.parse(respText);
    } catch {
      throw new Error(`SasaPay KYC returned non-JSON (HTTP ${response.status})`);
    }

    if (data.responseCode !== '0') {
      throw new Error(`SasaPay KYC failed: ${data.message || data.responseCode}`);
    }

    // (f) Update wallet status
    await base44.asServiceRole.entities.Wallet.update(wallet.id, {
      sasapay_account_status: data.data?.accountStatus || 'AWAITING_KYC_UPLOAD',
      sasapay_kyc_uploaded_at: new Date().toISOString(),
    });

    // AuditLog: SasaPay success
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: userId,
      action: 'sasapay_kyc_uploaded',
      entity_type: 'Wallet',
      entity_id: wallet.id,
      description: `SasaPay KYC auto-uploaded from DocuPass. Status: ${data.data?.accountStatus}`,
      new_values: {
        sasapay_account_status: data.data?.accountStatus,
        sasapay_kyc_uploaded_at: new Date().toISOString(),
      },
    });

    console.log(`[idAnalyzerCallback] SasaPay KYC push success for user ${userId}`);
  } catch (error) {
    console.error(`[idAnalyzerCallback] SasaPay KYC push failed for user ${userId}:`, error.message);

    // Flag wallet for admin review
    try {
      const wallets = await base44.asServiceRole.entities.Wallet.filter({
        user_id: userId,
        entity_type: 'personal',
      });
      if (wallets.length > 0) {
        await base44.asServiceRole.entities.Wallet.update(wallets[0].id, { needs_review: true });
      }
    } catch {
      // non-critical
    }

    // AuditLog: SasaPay failure
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: userId,
        action: 'sasapay_kyc_upload_failed',
        entity_type: 'Wallet',
        description: `SasaPay KYC auto-upload failed: ${error.message}`,
      });
    } catch {
      // non-critical
    }
  }
}

async function getSasapayToken() {
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
    throw new Error(`SasaPay auth returned non-JSON (HTTP ${response.status})`);
  }
  if (!data.access_token) {
    throw new Error(`SasaPay auth failed: ${data.detail || data.error || text.substring(0, 200)}`);
  }
  return data.access_token;
}

function getSasapayApiUrl() {
  const env = Deno.env.get('SASAPAY_ENVIRONMENT') || 'sandbox';
  return `https://${env}.sasapay.app/api/v2`;
}

async function downloadFile(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download file from ${url}`);
  return new File([await response.arrayBuffer()], 'file', {
    type: response.headers.get('content-type') || 'image/jpeg',
  });
}

// ---------------------------------------------------------------------------
// SMS notification (fire-and-forget)
// ---------------------------------------------------------------------------

async function sendKycSms(base44, userId, decision) {
  try {
    const user = await base44.asServiceRole.entities.User.get(userId);
    if (!user?.phone) {
      console.warn(`[idAnalyzerCallback] No phone for user ${userId}, skipping SMS`);
      return;
    }

    const templateKey = decision === 'accept' ? 'kyc_approved' : decision === 'reject' ? 'kyc_rejected' : null;
    const eventType = decision === 'accept' ? 'kyc_approved' : 'kyc_rejected';
    if (!templateKey) return; // review → no SMS

    // Fetch template body
    const templates = await base44.asServiceRole.entities.SmsTemplate.filter({
      template_key: templateKey,
      is_active: true,
    });
    if (templates.length === 0) {
      console.warn(`[idAnalyzerCallback] SMS template '${templateKey}' not found`);
      return;
    }

    let body = templates[0].body;
    body = body.replace('{name}', user.id_extracted_name || user.full_name || 'Rider');

    await base44.functions.invoke('sendSms', {
      phone: user.phone,
      message: body,
      templateKey,
      eventType,
      metadata: { decision, userId },
    });

    console.log(`[idAnalyzerCallback] SMS (${templateKey}) sent to user ${userId}`);
  } catch (error) {
    console.error(`[idAnalyzerCallback] SMS send failed for user ${userId}:`, error.message);
  }
}
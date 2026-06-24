import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * IDAnalyzer DocuPass webhook handler (v2).
 *
 * Atomic flow on every docupass_conclusive event:
 *   1. Validate HMAC signature (or query-string secret fallback)
 *   2. Filter events — only process docupass_conclusive
 *   3. Extract ALL ID fields (52+) + face + authentication + AML
 *   4. Upsert KycDocuments + hydrate User with full extracted identity
 *   5. Auto-set kyc_status, verification_complete, wallet tier on accept
 *   6. Push docs to SasaPay KYC (on accept, if wallet onboarded)
 *   7. SMS notification to rider
 *   8. AuditLog entries
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const rawBody = await req.text();

  // --- 1. Authentication ---
  const webhookSecret = Deno.env.get('IDANALYZER_WEBHOOK_SECRET');
  if (!webhookSecret) {
    return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const idaSignature = req.headers.get('X-IDA-Signature');
  const idaTimestamp = req.headers.get('X-IDA-Timestamp');
  const querySecret = new URL(req.url).searchParams.get('secret');

  let authenticated = false;

  if (idaSignature && idaTimestamp) {
    const expectedSig = await computeHmac(webhookSecret, `${idaTimestamp}.${rawBody}`);
    const tsNum = parseInt(idaTimestamp, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (isNaN(tsNum) || Math.abs(nowSec - tsNum) > 300) {
      return Response.json({ error: 'Stale timestamp' }, { status: 401 });
    }
    authenticated = await constantTimeEqual(expectedSig, idaSignature);
    if (!authenticated) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else if (querySecret === webhookSecret) {
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
    return Response.json({ success: true, message: `Ignored event: ${eventType}` });
  }

  const decision = payload.decision;
  const transactionId = payload.id || payload.transactionId;
  const customData = payload.customData;

  if (!transactionId || !decision) {
    return Response.json({ error: 'Missing required fields: id, decision' }, { status: 400 });
  }

  const statusMap = { accept: 'approved', review: 'pending', reject: 'rejected' };
  const docStatus = statusMap[decision] || 'pending';

  // --- Identify user ---
  let userId = customData;
  if (!userId && payload.reference) userId = payload.reference;
  if (!userId && payload.user_reference) userId = payload.user_reference;

  if (!userId) {
    return Response.json({ success: true, message: 'No user reference' });
  }

  // --- Idempotency check ---
  try {
    const existing = await base44.asServiceRole.entities.KycDocument.filter({
      provider_reference: transactionId,
    });
    if (existing.length > 0 && existing.some(d => d.status === 'approved')) {
      return Response.json({ success: true, message: 'Already processed' });
    }
  } catch (e) {
    console.warn('[idAnalyzerCallback] Idempotency check failed:', e.message);
  }

  // --- 3. Extract ALL data fields ---
  // DocuPass v2 callback wraps data in "data", Core API uses "result"
  const data = payload.data || payload.result || {};
  const outputImage = payload.outputImage || payload.output_image || {};
  const faceData = payload.face || data.face || {};
  const authentication = payload.authentication || data.authentication || {};
  const warnings = payload.warning || payload.warnings || [];

  const frontUrl = outputImage.front || outputImage.frontUrl || '';
  const backUrl = outputImage.back || outputImage.backUrl || '';
  const faceUrl = outputImage.face || outputImage.faceUrl || '';

  // Extract all standard ID fields
  const fullName = extractValue(data.fullName);
  const firstName = extractValue(data.firstName);
  const lastName = extractValue(data.lastName);
  const middleName = extractValue(data.middleName);
  const dob = extractValue(data.dob);
  const age = extractValue(data.age);
  const sex = extractValue(data.sex);
  const documentNumber = extractValue(data.documentNumber);
  const internalId = extractValue(data.internalId);
  const expiry = extractValue(data.expiry);
  const issued = extractValue(data.issued);
  const address1 = extractValue(data.address1);
  const address2 = extractValue(data.address2);
  const postcode = extractValue(data.postcode);
  const country = extractValue(data.country);
  const nationality = extractValue(data.nationality);
  const documentType = extractValue(data.documentType) || extractValue(data.type);
  const issuingAuthority = extractValue(data.issuingAuthority);
  const placeOfBirth = extractValue(data.placeOfBirth);
  const mrz = extractValue(data.mrz);

  // Face verification data
  let faceConfidence = null;
  let faceIsIdentical = null;
  if (faceData) {
    if (typeof faceData === 'number') {
      faceConfidence = faceData;
    } else if (Array.isArray(faceData) && faceData[0]) {
      faceConfidence = typeof faceData[0] === 'object' ? (faceData[0].confidence ?? faceData[0].value) : faceData[0];
    } else if (typeof faceData === 'object') {
      faceConfidence = faceData.confidence ?? faceData.value;
      faceIsIdentical = faceData.isIdentical ?? faceData.is_identical ?? null;
    }
  }
  if (faceConfidence != null && faceConfidence > 1) faceConfidence = faceConfidence / 100;

  // Document authentication
  let authScore = null;
  if (authentication) {
    if (typeof authentication === 'number') authScore = authentication;
    else if (typeof authentication === 'object') authScore = authentication.score ?? authentication.value ?? null;
  }

  // OCR match rate
  const matchRate = extractValue(data.matchRate) || payload.matchRate || payload.matchrate || null;

  // AML matches
  const amlMatches = payload.aml || data.aml || [];

  // Build comprehensive extracted data JSON
  const extractedData = {
    fullName, firstName, lastName, middleName,
    dob, age, sex,
    documentNumber, internalId, documentType, issuingAuthority,
    expiry, issued,
    address1, address2, postcode, country, nationality, placeOfBirth,
    face: { confidence: faceConfidence, isIdentical: faceIsIdentical },
    authentication: { score: authScore },
    matchRate,
    mrz,
    aml: amlMatches,
    warnings: warnings.map(w => ({
      code: w.code || w.name,
      description: w.description || w.message,
      severity: w.severity,
    })),
    transactionId,
    decision,
    rawPayloadKeys: Object.keys(data),
  };

  const rejectionReason = decision === 'reject'
    ? (warnings[0]?.description || warnings[0]?.message || 'Verification rejected')
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

  // --- Hydrate user with ALL extracted data + auto-set verification status ---
  try {
    const user = await base44.asServiceRole.entities.User.get(userId);
    const userUpdate = {
      docupass_decision: decision,
      id_extracted_data: JSON.stringify(extractedData),
    };

    // Store key fields individually for querying/display
    if (faceConfidence != null) userUpdate.id_face_confidence = faceConfidence;
    if (faceIsIdentical != null) userUpdate.id_face_identical = faceIsIdentical;
    if (authScore != null) userUpdate.id_authentication_score = authScore;
    if (matchRate != null) userUpdate.id_match_rate = matchRate;
    if (sex) userUpdate.id_sex = sex;
    if (address1) userUpdate.id_address = [address1, address2, postcode].filter(Boolean).join(', ');
    if (country) userUpdate.id_country = country;
    if (nationality) userUpdate.id_nationality = nationality;
    if (expiry) userUpdate.id_expiry_date = normalizeDate(expiry);
    if (issued) userUpdate.id_issued_date = normalizeDate(issued);

    // Auto-set verification status based on decision
    if (decision === 'accept') {
      userUpdate.kyc_status = 'verified';
      userUpdate.verification_complete = true;
      userUpdate.phone_verified = true;
      userUpdate.docupass_verified_at = new Date().toISOString();
      userUpdate.wallet_tier = 2;
      userUpdate.kyc_just_approved = true;

      if (fullName) userUpdate.id_extracted_name = fullName;
      if (dob) userUpdate.id_extracted_dob = normalizeDate(dob);
      if (documentNumber && !user?.national_id) userUpdate.national_id = documentNumber;
      if (dob) userUpdate.date_of_birth = normalizeDate(dob);

      // Upgrade wallet to Tier 2
      try {
        const wallets = await base44.asServiceRole.entities.Wallet.filter({
          user_id: userId,
          entity_type: 'personal',
        });
        if (wallets.length > 0) {
          await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
            tier: 2,
            status: 'active',
          });
        }
      } catch (e) {
        console.warn('[idAnalyzerCallback] Wallet upgrade failed:', e.message);
      }
    } else if (decision === 'reject') {
      userUpdate.kyc_status = 'rejected';
      userUpdate.verification_complete = false;
    } else if (decision === 'review') {
      userUpdate.kyc_status = 'pending';
      userUpdate.verification_complete = false;
    }

    await base44.asServiceRole.entities.User.update(userId, userUpdate);
  } catch (e) {
    console.warn('[idAnalyzerCallback] Failed to hydrate user:', e.message);
  }

  // --- AuditLog: DocuPass completion ---
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: userId,
      action: 'idanalyzer_docupass_completed',
      entity_type: 'KycDocument',
      description: `DocuPass verification ${decision}. Transaction: ${transactionId}. Face confidence: ${faceConfidence}, Auth score: ${authScore}`,
      new_values: extractedData,
    });
  } catch (e) {
    console.warn('[idAnalyzerCallback] AuditLog failed:', e.message);
  }

  // --- Return 200 immediately; SasaPay + SMS are fire-and-forget ---
  const responsePayload = Response.json({ success: true, status: docStatus, decision });

  const tasks = [];
  if (decision === 'accept' && frontUrl && backUrl && faceUrl) {
    tasks.push(pushToSasapay(base44, userId, { frontUrl, backUrl, faceUrl }));
  }
  tasks.push(sendKycSms(base44, userId, decision));
  Promise.allSettled(tasks).catch(() => {});

  return responsePayload;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractValue(field) {
  if (field == null) return null;
  if (Array.isArray(field)) return field[0]?.value || field[0] || null;
  if (typeof field === 'string') return field;
  if (typeof field === 'number') return field;
  return field.value || null;
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  // IDAnalyzer returns dates in various formats: YYYY/MM/DD, YYYY-MM-DD, DD/MM/YYYY
  const cleaned = String(dateStr).replace(/\//g, '-');
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.substring(0, 10);
  // Try DD-MM-YYYY → YYYY-MM-DD
  const parts = cleaned.split('-');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return cleaned.substring(0, 10);
}

async function computeHmac(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  const enc = new TextEncoder();
  const aHash = await crypto.subtle.digest('SHA-256', enc.encode(a));
  const bHash = await crypto.subtle.digest('SHA-256', enc.encode(b));
  const aArr = new Uint8Array(aHash);
  const bArr = new Uint8Array(bHash);
  let diff = 0;
  for (let i = 0; i < aArr.length; i++) diff |= aArr[i] ^ bArr[i];
  return diff === 0;
}

// ---------------------------------------------------------------------------
// SasaPay KYC push (service-role)
// ---------------------------------------------------------------------------

async function pushToSasapay(base44, userId, { frontUrl, backUrl, faceUrl }) {
  try {
    const wallets = await base44.asServiceRole.entities.Wallet.filter({
      user_id: userId, entity_type: 'personal',
    });
    if (wallets.length === 0) return;
    const wallet = wallets[0];
    if (!wallet.sasapay_account_number) return;

    const user = await base44.asServiceRole.entities.User.get(userId);
    if (!user?.phone) return;
    const merchantCode = Deno.env.get('SASAPAY_MERCHANT_CODE');
    if (!merchantCode) return;

    const [token, faceFile, frontFile, backFile] = await Promise.all([
      getSasapayToken(), downloadFile(faceUrl), downloadFile(frontUrl), downloadFile(backUrl),
    ]);

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
    try { data = JSON.parse(respText); } catch {
      throw new Error(`SasaPay KYC returned non-JSON (HTTP ${response.status})`);
    }

    if (data.responseCode !== '0') {
      throw new Error(`SasaPay KYC failed: ${data.message || data.responseCode}`);
    }

    await base44.asServiceRole.entities.Wallet.update(wallet.id, {
      sasapay_account_status: data.data?.accountStatus || 'AWAITING_KYC_UPLOAD',
      sasapay_kyc_uploaded_at: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.AuditLog.create({
      user_id: userId,
      action: 'sasapay_kyc_uploaded',
      entity_type: 'Wallet',
      entity_id: wallet.id,
      description: `SasaPay KYC auto-uploaded from DocuPass. Status: ${data.data?.accountStatus}`,
      new_values: { sasapay_account_status: data.data?.accountStatus },
    });
  } catch (error) {
    console.error(`[idAnalyzerCallback] SasaPay KYC push failed: ${error.message}`);
    try {
      const wallets = await base44.asServiceRole.entities.Wallet.filter({
        user_id: userId, entity_type: 'personal',
      });
      if (wallets.length > 0) {
        await base44.asServiceRole.entities.Wallet.update(wallets[0].id, { needs_review: true });
      }
    } catch {}
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: userId,
        action: 'sasapay_kyc_upload_failed',
        entity_type: 'Wallet',
        description: `SasaPay KYC auto-upload failed: ${error.message}`,
      });
    } catch {}
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
  try { data = JSON.parse(text); } catch {
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
    if (!user?.phone) return;

    const templateKey = decision === 'accept' ? 'kyc_approved' : decision === 'reject' ? 'kyc_rejected' : null;
    if (!templateKey) return;

    const templates = await base44.asServiceRole.entities.SmsTemplate.filter({
      template_key: templateKey, is_active: true,
    });
    if (templates.length === 0) return;

    let body = templates[0].body;
    body = body.replace('{name}', user.id_extracted_name || user.full_name || 'Rider');

    await base44.functions.invoke('sendSms', {
      phone: user.phone, message: body, templateKey,
      eventType: templateKey, metadata: { decision, userId },
    });
  } catch (error) {
    console.error(`[idAnalyzerCallback] SMS send failed: ${error.message}`);
  }
}
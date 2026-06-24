import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * IDAnalyzer DocuPass webhook handler (v2).
 *
 * Atomic flow on every docupass_conclusive event:
 *   1. Validate HMAC-SHA256 signature (v1=<hex> format per IDAnalyzer docs)
 *   2. Filter events — only process docupass_conclusive
 *   3. Extract ALL ID fields (per Data Fields doc) with confidence scores
 *   4. Extract face confidence from scores.faceCompare (NOT data.face)
 *   5. Store PDF audit report URL directly from outputFile (no download/upload)
 *   6. Upsert KycDocuments + hydrate User with full extracted identity
 *   7. Auto-set kyc_status, verification_complete, wallet tier on accept
 *   8. Push docs to SasaPay KYC (on accept, if wallet onboarded)
 *   9. SMS notification to rider
 *  10. AuditLog entries
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const rawBody = await req.text();

  // --- 1. HMAC-SHA256 Signature Verification ---
  const webhookSecret = Deno.env.get('IDANALYZER_WEBHOOK_SECRET');
  if (!webhookSecret) {
    return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const idaSignature = req.headers.get('X-IDA-Signature');
  const idaTimestamp = req.headers.get('X-IDA-Timestamp');
  const querySecret = new URL(req.url).searchParams.get('secret');

  let authenticated = false;

  if (idaSignature && idaTimestamp) {
    const tsNum = parseInt(idaTimestamp, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (isNaN(tsNum)) {
      console.warn(`[idAnalyzerCallback] Invalid timestamp header: "${idaTimestamp}"`);
      return Response.json({ error: 'Invalid timestamp' }, { status: 401 });
    }
    const tsDelta = Math.abs(nowSec - tsNum);
    if (tsDelta > 300) {
      console.warn(`[idAnalyzerCallback] Stale timestamp: delta=${tsDelta}s (limit=300s), received=${idaTimestamp}, now=${nowSec}`);
      return Response.json({ error: 'Stale timestamp' }, { status: 401 });
    }

    const expectedHmac = await computeHmac(webhookSecret, `${idaTimestamp}.${rawBody}`);

    const candidateSigs = [
      `v1=${expectedHmac}`,
      `sha256=${expectedHmac}`,
      expectedHmac,
    ];

    for (const candidate of candidateSigs) {
      if (await constantTimeEqual(candidate, idaSignature)) {
        authenticated = true;
        break;
      }
    }

    if (!authenticated) {
      const recvPrefix = idaSignature.substring(0, 20);
      const expPrefix = `v1=${expectedHmac.substring(0, 20)}`;
      console.warn(`[idAnalyzerCallback] Signature mismatch. Received: "${recvPrefix}...", Expected: "${expPrefix}..."`);
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else if (querySecret && querySecret === webhookSecret) {
    console.warn('[idAnalyzerCallback] Auth via query-string secret fallback (testing only)');
    authenticated = true;
  } else {
    console.warn('[idAnalyzerCallback] Rejected: no valid signature or query secret');
    return Response.json({ error: 'Authentication required — signature or secret missing' }, { status: 401 });
  }

  // --- Parse payload ---
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // --- 2. Event filtering ---
  const eventType = payload.event;
  if (eventType && eventType !== 'docupass_conclusive') {
    return Response.json({ success: true, message: `Ignored event: ${eventType}` });
  }

  const decision = payload.decision;
  // IDAnalyzer webhook uses transactionId (not id)
  const transactionId = payload.transactionId || payload.id;
  const customData = payload.customData;

  if (!transactionId || !decision) {
    return Response.json({ error: 'Missing required fields: transactionId, decision' }, { status: 400 });
  }

  const statusMap = { accept: 'approved', review: 'pending', reject: 'rejected' };
  const docStatus = statusMap[decision] || 'pending';

  // --- Identify user from customData (what we passed to DocuPass create) ---
  let userId = customData;
  if (!userId && payload.reference) userId = payload.reference;

  if (!userId) {
    return Response.json({ success: true, message: 'No user reference in payload' });
  }

  // --- Idempotency: key off transactionId + event ---
  try {
    const existing = await base44.asServiceRole.entities.KycDocument.filter({
      provider_reference: transactionId,
    });
    if (existing.length > 0) {
      return Response.json({ success: true, message: 'Already processed (idempotent)' });
    }
  } catch (e) {
    console.warn('[idAnalyzerCallback] Idempotency check failed:', e.message);
  }

  // --- 3. Extract ALL data fields with confidence (per Data Fields doc) ---
  const data = payload.data || {};
  const outputImage = payload.outputImage || {};
  const warnings = payload.warning || [];

  const frontUrl = outputImage.front || '';
  const backUrl = outputImage.back || '';
  const faceUrl = outputImage.face || '';

  // Correct IDAnalyzer v2 field names per https://developer.idanalyzer.com/help/data-fields
  const fieldDefs = [
    // Names
    'fullName', 'firstName', 'middleName', 'lastName',
    'firstNameLocal', 'middleNameLocal', 'lastNameLocal', 'fullNameLocal',
    // Dates
    'dob', 'dob_day', 'dob_month', 'dob_year',
    'expiry', 'expiry_day', 'expiry_month', 'expiry_year',
    'issued', 'issued_day', 'issued_month', 'issued_year',
    'daysToExpiry', 'daysFromIssue',
    // Personal Information
    'age', 'sex', 'height', 'weight', 'hairColor', 'eyeColor',
    'address1', 'address2', 'postcode', 'placeOfBirth', 'religion',
    // Document Information
    'documentNumber', 'personalNumber', 'documentSide', 'documentType', 'documentName',
    'internalId', 'issueAuthority',
    'stateFull', 'stateShort',
    'vehicleClass', 'restrictions', 'endorsement',
    // Country & Nationality (correct v2 names)
    'countryFull', 'countryIso2', 'countryIso3',
    'nationalityFull', 'nationalityIso2', 'nationalityIso3',
    // Other Data
    'optionalData', 'optionalData2', 'optionalData3', 'optionalData4',
  ];

  const fields = {};
  for (const key of fieldDefs) {
    const extracted = extractField(data[key]);
    if (extracted) {
      fields[key] = extracted;
    }
  }

  // Capture extra fields not in our list (forward compatibility)
  const extraFields = {};
  for (const key of Object.keys(data)) {
    if (!fieldDefs.includes(key) && key !== 'face' && key !== 'authentication' && key !== 'aml') {
      const extracted = extractField(data[key]);
      if (extracted && extracted.value != null) {
        extraFields[key] = extracted;
      }
    }
  }

  // Helper: get just the value from a field (avoids storing redundant `values` object)
  function fieldValue(key) {
    const f = fields[key];
    return f?.value ?? null;
  }

  // --- 4. Face match confidence from scores.faceCompare (NOT data.face) ---
  const scores = payload.scores || {};
  const faceConfidence = scores.faceCompare != null ? scores.faceCompare : null;

  // Face identical: derive from threshold (>= 0.7 = identical match)
  const faceIsIdentical = faceConfidence != null ? faceConfidence >= 0.7 : null;

  // --- Document authentication score (only anti-forgery warnings, not all high-severity) ---
  const ANTI_FORGERY_CODES = new Set([
    'IMAGE_FORGERY', 'FAKE_ID', 'FEATURE_VERIFICATION_FAILED',
    'ARTIFICIAL_IMAGE', 'RECAPTURED_DOCUMENT', 'SCREEN_DETECTED',
    'CHECK_DIGIT_FAILED', 'MRZ_VISUAL_VALID', 'PHYSICAL_DOCUMENT_MISSING',
  ]);
  const antiForgeryWarnings = warnings.filter(w => ANTI_FORGERY_CODES.has(w.code));
  const authScore = antiForgeryWarnings.length === 0 ? 1.0 : 0.0;

  // --- OCR quality: ratio of expected fields successfully extracted ---
  const totalFieldDefs = fieldDefs.length;
  const extractedCount = Object.keys(fields).length;
  const matchRate = totalFieldDefs > 0 ? Math.round((extractedCount / totalFieldDefs) * 100) / 100 : null;

  // --- PDF audit report URL from outputFile (no download needed) ---
  const outputFile = payload.outputFile || [];
  const auditReport = outputFile.find(f =>
    (f.name && f.name.toLowerCase().includes('audit')) ||
    (f.fileName && f.fileName.toLowerCase().endsWith('.pdf')) ||
    (f.fileName && f.fileName.toLowerCase().includes('audit'))
  );
  const auditReportUrl = auditReport?.fileUrl || null;

  // Build extracted data JSON (strip bounding boxes + redundant values to reduce storage)
  const extractedData = {
    fields,
    extraFields,
    face: { confidence: faceConfidence, isIdentical: faceIsIdentical },
    authentication: { score: authScore, antiForgeryOnly: true },
    warnings: warnings.map(w => ({
      code: w.code,
      description: w.description,
      severity: w.severity,
      decision: w.decision,
    })),
    transactionId,
    decision,
    auditReportUrl,
  };

  const rejectionReason = decision === 'reject'
    ? (warnings[0]?.description || 'Verification rejected by IDAnalyzer')
    : null;

  // --- 5. Upsert KycDocuments ---
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

  // --- 6. Hydrate User with essential fields + auto-set verification status ---
  // This is SYNCHRONOUS (before returning 200) because the frontend polls for these fields.
  // Wallet upgrade, AuditLog, SasaPay, SMS are moved to fire-and-forget after returning 200.
  let existingNationalId = null;
  try {
    const user = await base44.asServiceRole.entities.User.get(userId);
    existingNationalId = user?.national_id || null;
    const userUpdate = {
      docupass_decision: decision,
      id_extracted_data: JSON.stringify(extractedData),
      // Always mark report as fetched (we looked — URL either exists or doesn't)
      docupass_report_fetched: true,
    };

    // Store key fields individually for querying/display
    if (faceConfidence != null) userUpdate.id_face_confidence = faceConfidence;
    if (faceIsIdentical != null) userUpdate.id_face_identical = faceIsIdentical;
    if (authScore != null) userUpdate.id_authentication_score = authScore;
    if (matchRate != null) userUpdate.id_match_rate = matchRate;
    if (fieldValue('sex')) userUpdate.id_sex = fieldValue('sex');
    if (fieldValue('address1')) {
      userUpdate.id_address = [fieldValue('address1'), fieldValue('address2'), fieldValue('postcode')].filter(Boolean).join(', ');
    }
    if (fieldValue('countryFull')) userUpdate.id_country = fieldValue('countryFull');
    if (fieldValue('nationalityFull')) userUpdate.id_nationality = fieldValue('nationalityFull');
    if (fieldValue('expiry')) userUpdate.id_expiry_date = normalizeDate(fieldValue('expiry'));
    if (fieldValue('issued')) userUpdate.id_issued_date = normalizeDate(fieldValue('issued'));

    // Store audit report URL directly (no PDF download — optimizes DB for millions of users)
    if (auditReportUrl) {
      userUpdate.docupass_report_url = auditReportUrl;
    }

    // Auto-set verification status based on decision
    if (decision === 'accept') {
      userUpdate.kyc_status = 'verified';
      userUpdate.verification_complete = true;
      userUpdate.phone_verified = true;
      userUpdate.docupass_verified_at = new Date().toISOString();
      userUpdate.wallet_tier = 2;
      userUpdate.kyc_just_approved = true;

      if (fieldValue('fullName')) userUpdate.id_extracted_name = fieldValue('fullName');
      if (fieldValue('dob')) {
        userUpdate.id_extracted_dob = normalizeDate(fieldValue('dob'));
        userUpdate.date_of_birth = normalizeDate(fieldValue('dob'));
      }
      if (fieldValue('documentNumber') && !existingNationalId) {
        userUpdate.national_id = fieldValue('documentNumber');
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

  // --- Return 200 immediately; wallet upgrade, audit log, SasaPay, SMS are fire-and-forget ---
  // Per IDAnalyzer docs: "Your endpoint must return HTTP 200 within 10 seconds."
  const responsePayload = Response.json({ success: true, status: docStatus, decision });

  const tasks = [];
  // Wallet tier upgrade (fire-and-forget)
  if (decision === 'accept') {
    tasks.push(upgradeWalletTier(base44, userId));
  }
  // AuditLog (fire-and-forget)
  tasks.push(base44.asServiceRole.entities.AuditLog.create({
    user_id: userId,
    action: 'idanalyzer_docupass_completed',
    entity_type: 'KycDocument',
    description: `DocuPass ${decision}. Tx: ${transactionId}. Face: ${faceConfidence}, Auth: ${authScore}. Report: ${auditReportUrl ? 'stored' : 'none'}`,
    new_values: { decision, transactionId, faceConfidence, auditReportUrl },
  }).catch(() => {}));
  // SasaPay KYC push (fire-and-forget)
  if (decision === 'accept' && frontUrl && backUrl && faceUrl) {
    tasks.push(pushToSasapay(base44, userId, { frontUrl, backUrl, faceUrl }));
  }
  // SMS notification (fire-and-forget)
  tasks.push(sendKycSms(base44, userId, decision));
  Promise.allSettled(tasks).catch(() => {});

  return responsePayload;
});

// ---------------------------------------------------------------------------
// Wallet tier upgrade (fire-and-forget, called after returning 200)
// ---------------------------------------------------------------------------

async function upgradeWalletTier(base44, userId) {
  try {
    const wallets = await base44.asServiceRole.entities.Wallet.filter({
      user_id: userId, entity_type: 'personal',
    });
    if (wallets.length > 0) {
      await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
        tier: 2, status: 'active',
      });
    }
  } catch (e) {
    console.warn('[idAnalyzerCallback] Wallet upgrade failed:', e.message);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a field value and its confidence from IDAnalyzer v2 payload.
 * Per Data Fields doc: each key holds an ARRAY of {value, confidence, source, index, inputBox, outputBox}.
 * We strip inputBox/outputBox to reduce storage.
 */
function extractField(field) {
  if (field == null) return null;
  if (typeof field === 'string') return { value: field, confidence: null };
  if (typeof field === 'number') return { value: field, confidence: null };
  if (typeof field === 'boolean') return { value: field, confidence: null };
  if (Array.isArray(field)) {
    if (field.length === 0) return null;
    const first = field[0];
    if (typeof first === 'object') {
      return { value: first.value ?? null, confidence: first.confidence ?? null };
    }
    return { value: first, confidence: null };
  }
  if (typeof field === 'object') {
    return { value: field.value ?? null, confidence: field.confidence ?? null };
  }
  return null;
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  // IDAnalyzer returns YYYY/MM/DD — convert to YYYY-MM-DD for date field
  const cleaned = String(dateStr).replace(/\//g, '-');
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.substring(0, 10);
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
// SasaPay KYC push (service-role, fire-and-forget)
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
    throw new Error(`SasaPay auth failed: ${data.detail || data.error}`);
  }
  return data.access_token;
}

function getSasapayApiUrl() {
  const env = Deno.env.get('SASAPAY_ENVIRONMENT') || 'sandbox';
  return `https://${env}.sasapay.app/api/v2`;
}

async function downloadFile(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download file: ${url}`);
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
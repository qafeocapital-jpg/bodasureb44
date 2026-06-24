import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * IDAnalyzer DocuPass webhook handler (v2).
 *
 * Atomic flow on every docupass_conclusive event:
 *   1. Validate HMAC signature (or query-string secret fallback)
 *   2. Filter events — only process docupass_conclusive
 *   3. Extract ALL ID fields (52+) with confidence scores + face + auth + AML
 *   4. Upsert KycDocuments + hydrate User with full extracted identity
 *   5. Auto-set kyc_status, verification_complete, wallet tier on accept
 *   6. Push docs to SasaPay KYC (on accept, if wallet onboarded)
 *   7. SMS notification to rider
 *   8. Fetch + store PDF audit report from IDAnalyzer
 *   9. AuditLog entries
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

  // --- 3. Extract ALL data fields with confidence ---
  const data = payload.data || payload.result || {};
  const outputImage = payload.outputImage || payload.output_image || {};
  const faceData = payload.face || data.face || {};
  const authentication = payload.authentication || data.authentication || {};
  const warnings = payload.warning || payload.warnings || [];

  const frontUrl = outputImage.front || outputImage.frontUrl || '';
  const backUrl = outputImage.back || outputImage.backUrl || '';
  const faceUrl = outputImage.face || outputImage.faceUrl || '';

  // Extract ALL standard ID fields with confidence scores
  const fieldDefs = [
    // Identity
    'fullName', 'firstName', 'lastName', 'middleName',
    'dob', 'age', 'dayOfBirth', 'monthOfBirth', 'yearOfBirth',
    'sex', 'placeOfBirth', 'personalNumber',
    // Document
    'documentNumber', 'internalId', 'documentType', 'documentName', 'documentSide',
    'issuingAuthority', 'issued', 'daysFromIssue', 'expiry',
    'mrz',
    // Address / Location
    'address1', 'address2', 'postcode',
    'district', 'division', 'location', 'subLocation',
    // Nationality & Country
    'country', 'issuedCountryIso2', 'issuedCountryIso3',
    'nationality', 'nationalityIso2', 'nationalityIso3',
    'optionalData1', 'optionalData2',
  ];

  const fields = {};
  const values = {};
  for (const key of fieldDefs) {
    const extracted = extractField(data[key]);
    if (extracted) {
      fields[key] = extracted;
      if (extracted.value != null) values[key] = extracted.value;
    }
  }

  // Also capture any extra fields in the payload we didn't explicitly list
  const extraFields = {};
  for (const key of Object.keys(data)) {
    if (!fieldDefs.includes(key) && key !== 'face' && key !== 'authentication' && key !== 'aml') {
      const extracted = extractField(data[key]);
      if (extracted && extracted.value != null) {
        extraFields[key] = extracted;
      }
    }
  }

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
  const matchRateField = extractField(data.matchRate) || extractField(data.matchrate);
  const matchRate = matchRateField?.value || payload.matchRate || payload.matchrate || null;

  // AML matches
  const amlMatches = payload.aml || data.aml || [];

  // Build comprehensive extracted data JSON with confidence scores
  const extractedData = {
    fields,
    extraFields,
    values,
    face: { confidence: faceConfidence, isIdentical: faceIsIdentical },
    authentication: { score: authScore },
    matchRate,
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
      docupass_report_fetched: false,
    };

    // Store key fields individually for querying/display
    if (faceConfidence != null) userUpdate.id_face_confidence = faceConfidence;
    if (faceIsIdentical != null) userUpdate.id_face_identical = faceIsIdentical;
    if (authScore != null) userUpdate.id_authentication_score = authScore;
    if (matchRate != null) userUpdate.id_match_rate = matchRate;
    if (values.sex) userUpdate.id_sex = values.sex;
    if (values.address1) userUpdate.id_address = [values.address1, values.address2, values.postcode].filter(Boolean).join(', ');
    if (values.country) userUpdate.id_country = values.country;
    if (values.nationality) userUpdate.id_nationality = values.nationality;
    if (values.expiry) userUpdate.id_expiry_date = normalizeDate(values.expiry);
    if (values.issued) userUpdate.id_issued_date = normalizeDate(values.issued);

    // Auto-set verification status based on decision
    if (decision === 'accept') {
      userUpdate.kyc_status = 'verified';
      userUpdate.verification_complete = true;
      userUpdate.phone_verified = true;
      userUpdate.docupass_verified_at = new Date().toISOString();
      userUpdate.wallet_tier = 2;
      userUpdate.kyc_just_approved = true;

      if (values.fullName) userUpdate.id_extracted_name = values.fullName;
      if (values.dob) userUpdate.id_extracted_dob = normalizeDate(values.dob);
      if (values.documentNumber && !user?.national_id) userUpdate.national_id = values.documentNumber;
      if (values.dob) userUpdate.date_of_birth = normalizeDate(values.dob);

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

  // --- Return 200 immediately; SasaPay + SMS + PDF are fire-and-forget ---
  const responsePayload = Response.json({ success: true, status: docStatus, decision });

  const tasks = [];
  if (decision === 'accept' && frontUrl && backUrl && faceUrl) {
    tasks.push(pushToSasapay(base44, userId, { frontUrl, backUrl, faceUrl }));
  }
  tasks.push(sendKycSms(base44, userId, decision));
  tasks.push(fetchDocupassReport(base44, userId, transactionId));
  Promise.allSettled(tasks).catch(() => {});

  return responsePayload;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a field value and its confidence score from IDAnalyzer payload.
 * Fields can be: string, number, array of {value, confidence}, or {value, confidence}.
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
      return { value: first.value ?? first, confidence: first.confidence ?? null };
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
// PDF Audit Report fetch (fire-and-forget)
// ---------------------------------------------------------------------------

async function fetchDocupassReport(base44, userId, transactionId) {
  const apiKey = Deno.env.get('IDANALYZER_API_KEY');
  if (!apiKey) {
    console.warn('[idAnalyzerCallback] IDANALYZER_API_KEY not set, skipping PDF fetch');
    return;
  }

  try {
    // Step 1: Get the transaction record to find the audit report file name
    const txResponse = await fetch(`https://api2.idanalyzer.com/transaction/${transactionId}`, {
      method: 'GET',
      headers: { 'X-API-KEY': apiKey },
    });

    if (!txResponse.ok) {
      throw new Error(`Transaction API returned HTTP ${txResponse.status}`);
    }

    const txData = await txResponse.json();

    // Find the audit report file name in the transaction data
    // IDAnalyzer stores output files in the transaction record
    let reportFileName = null;
    if (txData.data) {
      // Look for audit report file in various possible locations
      reportFileName = txData.data.auditReport || txData.data.audit_report ||
        txData.data.fileName || txData.data.file_name || null;
      // Some transactions store files in an array
      if (!reportFileName && Array.isArray(txData.data.files)) {
        const auditFile = txData.data.files.find(f =>
          f.fileName?.includes('audit') || f.fileName?.includes('report') || f.fileName?.endsWith('.pdf')
        );
        reportFileName = auditFile?.fileName || auditFile?.name || null;
      }
    }
    if (!reportFileName && txData.fileName) reportFileName = txData.fileName;

    if (!reportFileName) {
      console.warn('[idAnalyzerCallback] No audit report file name found in transaction data');
      await base44.asServiceRole.entities.User.update(userId, { docupass_report_fetched: true });
      return;
    }

    // Step 2: Download the PDF from the file vault
    const fileResponse = await fetch(`https://api2.idanalyzer.com/filevault/${reportFileName}`, {
      method: 'GET',
      headers: { 'X-API-KEY': apiKey },
    });

    if (!fileResponse.ok) {
      throw new Error(`File vault API returned HTTP ${fileResponse.status}`);
    }

    const pdfBlob = await fileResponse.blob();
    const pdfFile = new File([pdfBlob], `docupass_report_${transactionId}.pdf`, {
      type: 'application/pdf',
    });

    // Step 3: Upload to BodaSure file storage
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });

    // Step 4: Store the URL on the User entity
    await base44.asServiceRole.entities.User.update(userId, {
      docupass_report_url: uploadResult.file_url,
      docupass_report_fetched: true,
    });

    await base44.asServiceRole.entities.AuditLog.create({
      user_id: userId,
      action: 'idanalyzer_audit_report_stored',
      entity_type: 'User',
      entity_id: userId,
      description: `DocuPass audit report PDF stored. File: ${reportFileName}`,
      new_values: { docupass_report_url: uploadResult.file_url },
    });
  } catch (error) {
    console.error(`[idAnalyzerCallback] PDF audit report fetch failed: ${error.message}`);
    try {
      await base44.asServiceRole.entities.User.update(userId, { docupass_report_fetched: true });
    } catch {}
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: userId,
        action: 'idanalyzer_audit_report_failed',
        entity_type: 'User',
        description: `Failed to fetch/store DocuPass audit report: ${error.message}`,
      });
    } catch {}
  }
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
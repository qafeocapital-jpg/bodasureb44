import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * IDAnalyzer DocuPass webhook handler (v3).
 *
 * Authentication: Fetch transaction directly from IDAnalyzer API (bypasses HMAC
 * verification, which fails due to Base44 modifying request body bytes in transit).
 *
 * Flow on every docupass_conclusive event:
 *   1. DEAD-LETTER LOG: store raw payload to PaymentEvent immediately (before processing)
 *   2. Extract transactionId, filter non-conclusive events
 *   3. GET https://api2.idanalyzer.com/transaction/{transactionId} with X-API-KEY
 *   4. IDEMPOTENCY: skip if already processed with same decision
 *   5. Extract ALL ID fields with confidence scores
 *   6. Upsert KycDocuments
 *   7. Hydrate User:
 *      - accept  → overwrite profile (full_name, national_id, dob, avatar_url),
 *                 set kyc_status='pending_confirmation' (NOT verified yet)
 *      - reject  → kyc_status='rejected', increment kyc_attempts
 *      - review  → kyc_status='pending', account_state='KYC_REVIEW'
 *   8. SMS notification (reject only; accept SMS sent from confirmKycDetails)
 *   9. AuditLog
 *  10. Mark PaymentEvent as processed, return 200
 *
 * MISMATCH REJECT LOGIC REMOVED — on accept, we always overwrite the profile
 * with OCR data. The user confirms their details via a confirmation screen
 * before verification is finalized (confirmKycDetails function).
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const sr = base44.asServiceRole;

  const rawBody = await req.text();

  // --- Parse incoming payload ---
  let incomingPayload;
  try {
    incomingPayload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const eventType = incomingPayload.event;
  const txIdRaw = incomingPayload.transactionId || incomingPayload.id || '';
  console.log('[idAnalyzerCallback] Received event=' + eventType + ', transactionId=' + txIdRaw);

  // --- 1. DEAD-LETTER LOG: store raw payload immediately (before any processing) ---
  let logEntry = null;
  try {
    logEntry = await sr.entities.PaymentEvent.create({
      event_type: 'idanalyzer_webhook',
      reference: txIdRaw,
      payload: incomingPayload,
      processed: false,
    });
  } catch (e) {
    console.warn('[idAnalyzerCallback] Dead-letter log failed:', e.message);
  }

  // Helper to mark the log entry as processed
  async function markProcessed() {
    if (!logEntry) return;
    try {
      await sr.entities.PaymentEvent.update(logEntry.id, {
        processed: true,
        processed_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[idAnalyzerCallback] Mark processed failed:', e.message);
    }
  }

  // --- 2. Event filtering — early return for non-conclusive events ---
  if (eventType && eventType !== 'docupass_conclusive') {
    await markProcessed();
    return Response.json({ success: true, message: `Ignored event: ${eventType}` });
  }

  // --- 3. Extract transactionId ---
  const transactionId = txIdRaw;
  if (!transactionId) {
    await markProcessed();
    return Response.json({ success: true, message: 'No transactionId in payload' });
  }

  // --- 4. Fetch authoritative transaction from IDAnalyzer API ---
  const apiKey = Deno.env.get('IDANALYZER_API_KEY');
  if (!apiKey) {
    console.error('[idAnalyzerCallback] IDANALYZER_API_KEY not configured');
    await markProcessed();
    return Response.json({ error: 'API key not configured' }, { status: 500 });
  }

  let payload;
  try {
    console.log('[idAnalyzerCallback] Re-fetching transaction: ' + transactionId);
    const res = await fetch(`https://api2.idanalyzer.com/transaction/${transactionId}`, {
      method: 'GET',
      headers: { 'X-API-KEY': apiKey, 'Accept': 'application/json' },
    });

    if (res.status === 404) {
      console.warn('[idAnalyzerCallback] Transaction not found (404). Discarding.');
      await markProcessed();
      return Response.json({ success: true, message: 'Transaction not found' });
    }
    if (res.status === 429) {
      console.warn('[idAnalyzerCallback] Rate limited (429). Returning 503.');
      return Response.json({ error: 'IDAnalyzer rate limited' }, { status: 503 });
    }
    if (res.status >= 500) {
      console.error(`[idAnalyzerCallback] IDAnalyzer API ${res.status}. Returning 500.`);
      return Response.json({ error: `IDAnalyzer API ${res.status}` }, { status: 500 });
    }
    if (!res.ok) {
      const errData = await res.text();
      console.error(`[idAnalyzerCallback] IDAnalyzer API error ${res.status}: ${errData}`);
      return Response.json({ error: `Unexpected API error ${res.status}` }, { status: 500 });
    }

    payload = await res.json();
    console.log('[idAnalyzerCallback] Fetched. decision=' + payload.decision);
  } catch (e) {
    console.error('[idAnalyzerCallback] Fetch failed:', e.message);
    return Response.json({ error: 'Fetch exception: ' + e.message }, { status: 500 });
  }

  const decision = payload.decision;
  const customData = incomingPayload.customData || payload.customData;

  if (!decision) {
    await markProcessed();
    return Response.json({ error: 'Missing decision' }, { status: 400 });
  }

  const statusMap = { accept: 'approved', review: 'pending', reject: 'rejected' };
  const docStatus = statusMap[decision] || 'pending';

  // --- Identify user ---
  let userId = customData;
  if (!userId && payload.reference) userId = payload.reference;
  if (!userId) {
    console.error('[idAnalyzerCallback] No userId for transactionId=' + transactionId);
    await markProcessed();
    return Response.json({ success: true, message: 'No user reference' });
  }

  // Validate user exists
  try {
    const userExists = await sr.entities.User.get(userId);
    if (!userExists) {
      console.error('[idAnalyzerCallback] Invalid userId: ' + userId);
      await markProcessed();
      return Response.json({ error: 'User not found' }, { status: 400 });
    }
  } catch (e) {
    console.error('[idAnalyzerCallback] User validation failed: ' + e.message);
    return Response.json({ error: 'User validation failed' }, { status: 500 });
  }

  // --- 5. IDEMPOTENCY CHECK (enhanced) ---
  // (a) If user already has this decision AND kyc_status is terminal, skip
  try {
    const existingUser = await sr.entities.User.get(userId);
    if (existingUser?.docupass_decision === decision &&
        ['verified', 'pending_confirmation'].includes(existingUser?.kyc_status)) {
      console.log('[idAnalyzerCallback] Idempotent skip — already processed with same decision');
      await markProcessed();
      return Response.json({ success: true, message: 'Already processed (idempotent)' });
    }
  } catch (e) {
    console.warn('[idAnalyzerCallback] User idempotency check failed:', e.message);
  }

  // (b) KycDocument idempotency by provider_reference
  try {
    const existing = await sr.entities.KycDocument.filter({ provider_reference: transactionId });
    if (existing.length > 0 && existing[0].status === docStatus) {
      console.log('[idAnalyzerCallback] Idempotent skip — KycDocument already processed');
      await markProcessed();
      return Response.json({ success: true, message: 'Already processed (idempotent)' });
    }
  } catch (e) {
    console.warn('[idAnalyzerCallback] KycDocument idempotency check failed:', e.message);
  }

  // --- 6. Extract ALL data fields ---
  const data = payload.data || {};
  const outputImage = payload.outputImage || {};
  const warnings = payload.warning || [];

  const frontUrl = outputImage.front || '';
  const backUrl = outputImage.back || '';
  const faceUrl = outputImage.face || '';

  const fieldDefs = [
    'fullName', 'firstName', 'middleName', 'lastName',
    'firstNameLocal', 'middleNameLocal', 'lastNameLocal', 'fullNameLocal',
    'dob', 'dob_day', 'dob_month', 'dob_year',
    'expiry', 'expiry_day', 'expiry_month', 'expiry_year',
    'issued', 'issued_day', 'issued_month', 'issued_year',
    'daysToExpiry', 'daysFromIssue',
    'age', 'sex', 'height', 'weight', 'hairColor', 'eyeColor',
    'address1', 'address2', 'postcode', 'placeOfBirth', 'religion',
    'documentNumber', 'personalNumber', 'documentSide', 'documentType', 'documentName',
    'internalId', 'issueAuthority',
    'stateFull', 'stateShort',
    'vehicleClass', 'restrictions', 'endorsement',
    'countryFull', 'countryIso2', 'countryIso3',
    'nationalityFull', 'nationalityIso2', 'nationalityIso3',
    'optionalData', 'optionalData2', 'optionalData3', 'optionalData4',
  ];

  const fields = {};
  for (const key of fieldDefs) {
    const extracted = extractField(data[key]);
    if (extracted) fields[key] = extracted;
  }

  const extraFields = {};
  for (const key of Object.keys(data)) {
    if (!fieldDefs.includes(key) && key !== 'face' && key !== 'authentication' && key !== 'aml') {
      const extracted = extractField(data[key]);
      if (extracted && extracted.value != null) extraFields[key] = extracted;
    }
  }

  function fieldValue(key) {
    return fields[key]?.value ?? null;
  }

  // Face match confidence
  const scores = payload.scores || {};
  const faceConfidence = scores.faceCompare != null ? scores.faceCompare : null;
  const faceIsIdentical = faceConfidence != null ? faceConfidence >= 0.7 : null;

  // Document authentication score
  const ANTI_FORGERY_CODES = new Set([
    'IMAGE_FORGERY', 'FAKE_ID', 'FEATURE_VERIFICATION_FAILED',
    'ARTIFICIAL_IMAGE', 'RECAPTURED_DOCUMENT', 'SCREEN_DETECTED',
    'CHECK_DIGIT_FAILED', 'MRZ_VISUAL_VALID', 'PHYSICAL_DOCUMENT_MISSING',
  ]);
  const antiForgeryWarnings = warnings.filter(w => ANTI_FORGERY_CODES.has(w.code));
  const authScore = antiForgeryWarnings.length === 0 ? 1.0 : 0.0;

  const totalFieldDefs = fieldDefs.length;
  const extractedCount = Object.keys(fields).length;
  const matchRate = totalFieldDefs > 0 ? Math.round((extractedCount / totalFieldDefs) * 100) / 100 : null;

  // PDF audit report URL
  const outputFile = payload.outputFile || [];
  const auditReport = outputFile.find(f =>
    (f.name && f.name.toLowerCase().includes('audit')) ||
    (f.fileName && f.fileName.toLowerCase().endsWith('.pdf')) ||
    (f.fileName && f.fileName.toLowerCase().includes('audit'))
  );
  const auditReportUrl = auditReport?.fileUrl || null;

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

  // --- 7. Upsert KycDocuments ---
  const existingDocs = await sr.entities.KycDocument.filter({ user_id: userId });
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

  try {
    await Promise.all(docTypes.map(async ({ type, url }) => {
      const existing = existingDocs.find(d => d.document_type === type);
      const recordData = { ...upsertData, file_url: url || existing?.file_url || '' };
      if (existing) {
        await sr.entities.KycDocument.update(existing.id, recordData);
      } else {
        await sr.entities.KycDocument.create({
          user_id: userId,
          document_type: type,
          ...recordData,
        });
      }
    }));
  } catch (e) {
    console.error('[idAnalyzerCallback] KycDocument upsert failed:', e.message);
    return Response.json({ error: 'KycDocument upsert failed: ' + e.message }, { status: 500 });
  }

  if (!frontUrl && !backUrl && !faceUrl) {
    console.warn('[idAnalyzerCallback] All outputImage URLs empty — verify IDAnalyzer profile has "Return Output Image" enabled');
  }

  // --- 8. Hydrate User ---
  // Fetch user profile (for kyc_attempts increment on reject)
  let userProfile = null;
  try {
    userProfile = await sr.entities.User.get(userId);
  } catch (e) {
    console.error('[idAnalyzerCallback] Failed to fetch user:', e.message);
    return Response.json({ error: 'User profile fetch failed' }, { status: 500 });
  }

  try {
    const userUpdate = {
      docupass_decision: decision,
      id_extracted_data: JSON.stringify(extractedData),
      docupass_report_fetched: true,
    };

    // Store confidence / metadata fields
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
    if (auditReportUrl) userUpdate.docupass_report_url = auditReportUrl;

    // --- ACCEPT: overwrite profile, set pending_confirmation ---
    if (decision === 'accept') {
      userUpdate.kyc_status = 'pending_confirmation';
      userUpdate.verification_complete = false;
      userUpdate.phone_verified = true;

      // Always overwrite full_name with OCR result
      if (fieldValue('fullName')) {
        userUpdate.full_name = fieldValue('fullName');
        userUpdate.id_extracted_name = fieldValue('fullName');
      }
      // Always overwrite date_of_birth
      if (fieldValue('dob')) {
        userUpdate.id_extracted_dob = normalizeDate(fieldValue('dob'));
        userUpdate.date_of_birth = normalizeDate(fieldValue('dob'));
      }
      // Always overwrite national_id
      if (fieldValue('documentNumber')) {
        userUpdate.national_id = fieldValue('documentNumber');
      }
      // Selfie → profile photo (overwrite avatar_url)
      if (faceUrl) {
        userUpdate.avatar_url = faceUrl;
      }
      // NOTE: Do NOT set wallet_tier, verification_complete, transitionAccountState,
      // convertProvisionalPermit, or upgradeWallet here — that happens in confirmKycDetails
    }
    // --- REJECT: kyc_status='rejected', increment attempts ---
    else if (decision === 'reject') {
      userUpdate.kyc_status = 'rejected';
      userUpdate.verification_complete = false;
      userUpdate.kyc_attempts = (userProfile.kyc_attempts || 0) + 1;
    }
    // --- REVIEW: kyc_status='pending', account_state='KYC_REVIEW' ---
    else if (decision === 'review') {
      userUpdate.kyc_status = 'pending';
      userUpdate.verification_complete = false;
      userUpdate.account_state = 'KYC_REVIEW';
      userUpdate.account_state_updated_at = new Date().toISOString();
    }

    await sr.entities.User.update(userId, userUpdate);

    // Reject → transitionAccountState(KYC_REJECTED)
    if (decision === 'reject') {
      try {
        await base44.functions.invoke('transitionAccountState', {
          userId,
          event: 'KYC_REJECTED',
          metadata: { transactionId, rejectionReason },
        });
      } catch (stateError) {
        console.error('[idAnalyzerCallback] State transition (reject) failed:', stateError.message);
      }
    }

    await sr.entities.AuditLog.create({
      user_id: userId,
      action: 'idanalyzer_docupass_completed',
      entity_type: 'KycDocument',
      description: `DocuPass ${decision}. Tx: ${transactionId}. Face: ${faceConfidence}, Auth: ${authScore}. Report: ${auditReportUrl ? 'stored' : 'none'}`,
      new_values: { decision, transactionId, faceConfidence, auditReportUrl },
    });
  } catch (e) {
    console.error('[idAnalyzerCallback] User hydration failed:', e.message);
    return Response.json({ error: 'Hydration failed: ' + e.message }, { status: 500 });
  }

  // --- SMS notification (reject only; accept SMS sent from confirmKycDetails) ---
  if (decision === 'reject') {
    sendKycSms(base44, userId, decision).catch(() => {});
  }

  await markProcessed();
  return Response.json({ success: true, status: docStatus, decision });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const cleaned = String(dateStr).replace(/\//g, '-');
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    const result = cleaned.substring(0, 10);
    if (isValidDate(result)) return result;
    return null;
  }
  const parts = cleaned.split('-');
  if (parts.length === 3 && parts[2].length === 4) {
    const result = `${parts[2]}-${parts[1]}-${parts[0]}`;
    if (isValidDate(result)) return result;
    return null;
  }
  return null;
}

function isValidDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) daysInMonth[1] = 29;
  if (day > daysInMonth[month - 1]) return false;
  const now = new Date();
  if (year > now.getFullYear() || year < 1900) return false;
  return true;
}

async function sendKycSms(base44, userId, decision) {
  try {
    const user = await base44.asServiceRole.entities.User.get(userId);
    if (!user?.phone) return;
    const templateKey = decision === 'reject' ? 'kyc_rejected' : null;
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
    console.error('[idAnalyzerCallback] SMS send failed: ' + error.message);
  }
}
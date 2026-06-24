import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * IDAnalyzer DocuPass webhook handler (v2).
 *
 * Authentication: Fetch transaction directly from IDAnalyzer API (bypasses HMAC verification,
 * which fails due to Base44 modifying request body bytes in transit).
 *
 * Atomic flow on every docupass_conclusive event:
 *   1. Extract transactionId from incoming payload
 *   2. Filter events — only process docupass_conclusive (skip fetch for other events)
 *   3. Call GET https://api2.idanalyzer.com/transaction/{transactionId} with X-API-KEY
 *   4. If 404/error, silently discard (not a genuine webhook)
 *   5. Use re-fetched response as authoritative payload
 *   6. Extract ALL ID fields (per Data Fields doc) with confidence scores
 *   7. Extract face confidence from scores.faceCompare (NOT data.face)
 *   8. Store PDF audit report URL directly from outputFile (no download/upload)
 *   9. Upsert KycDocuments + hydrate User with full extracted identity
 *   10. Auto-set kyc_status, verification_complete, wallet tier on accept
 *   11. SMS notification to rider
 *   12. AuditLog entries
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const rawBody = await req.text();

  // --- Parse incoming payload (event filtering only) ---
  let incomingPayload;
  try {
    incomingPayload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // --- 1. Event filtering — early return for non-conclusive events ---
  const eventType = incomingPayload.event;
  console.log('[idAnalyzerCallback] Received event=' + eventType + ', transactionId=' + (incomingPayload.transactionId || 'unknown'));
  
  if (eventType && eventType !== 'docupass_conclusive') {
    return Response.json({ success: true, message: `Ignored event: ${eventType}` });
  }

  // --- 2. Extract transactionId from incoming payload ---
  const transactionId = incomingPayload.transactionId || incomingPayload.id;
  if (!transactionId) {
    return Response.json({ success: true, message: 'No transactionId in payload' });
  }

  // --- 3. Fetch authoritative transaction from IDAnalyzer API ---
  const apiKey = Deno.env.get('IDANALYZER_API_KEY');
  if (!apiKey) {
    console.error('[idAnalyzerCallback] IDANALYZER_API_KEY not configured');
    return Response.json({ error: 'API key not configured' }, { status: 500 });
  }

  let payload;
  try {
    console.log('[idAnalyzerCallback] Re-fetching transaction from IDAnalyzer API: ' + transactionId);
    const res = await fetch(`https://api2.idanalyzer.com/transaction/${transactionId}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
      },
    });

    if (res.status === 404) {
      console.warn('[idAnalyzerCallback] Transaction not found (404). Silently discarding.');
      return Response.json({ success: true, message: 'Transaction not found — not a genuine webhook' });
    }

    if (res.status === 429) {
     console.warn('[idAnalyzerCallback] Rate limited (429). Returning 503 for retry.');
     return Response.json({ error: 'IDAnalyzer rate limited — retrying' }, { status: 503 });
    }

    // Return 500 for IDAnalyzer 5xx so they retry per their schedule
    if (res.status >= 500) {
      console.error(`[idAnalyzerCallback] IDAnalyzer API error ${res.status}. Returning 500 for retry.`);
      return Response.json({ error: `IDAnalyzer API ${res.status}` }, { status: 500 });
    }

    if (!res.ok) {
      const errData = await res.text();
      console.error(`[idAnalyzerCallback] IDAnalyzer API error ${res.status}: ${errData}`);
      return Response.json({ error: `Unexpected API error ${res.status}` }, { status: 500 });
    }

    payload = await res.json();
    console.log('[idAnalyzerCallback] Successfully re-fetched transaction, decision=' + payload.decision);
  } catch (e) {
    console.error('[idAnalyzerCallback] Failed to fetch transaction:', e.message);
    return Response.json({ error: 'Fetch exception: ' + e.message }, { status: 500 });
  }

  // --- Continue with extracted transactionId and decision ---
  const decision = payload.decision;
  const customData = incomingPayload.customData || payload.customData;

  if (!transactionId || !decision) {
    return Response.json({ error: 'Missing required fields: transactionId, decision' }, { status: 400 });
  }

  const statusMap = { accept: 'approved', review: 'pending', reject: 'rejected' };
  const docStatus = statusMap[decision] || 'pending';

  // --- Identify user from customData (what we passed to DocuPass create) ---
  let userId = customData;
  if (!userId && payload.reference) userId = payload.reference;

  if (!userId) {
    console.error(`[idAnalyzerCallback] No userId found for transactionId=${transactionId}`);
    return Response.json({ success: true, message: 'No user reference in payload' });
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

  // --- Idempotency check (BEFORE any DB writes) ---
  try {
    const existing = await base44.asServiceRole.entities.KycDocument.filter({
      provider_reference: transactionId,
    });
    // If decision matches, we've already processed this transaction
    if (existing.length > 0 && existing[0].status === docStatus) {
      return Response.json({ success: true, message: 'Already processed (idempotent)' });
    }
  } catch (e) {
    console.warn('[idAnalyzerCallback] Idempotency check failed:', e.message);
  }

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

  // Wrap KycDocument upsert in try-catch; return 500 on error so IDAnalyzer retries
  try {
    await Promise.all(docTypes.map(async ({ type, url }) => {
      const existing = existingDocs.find(d => d.document_type === type);
      // FIX: fallback file_url to '' (empty string) not null — KycDocument.file_url is required string
      const recordData = { ...upsertData, file_url: url || existing?.file_url || '' };
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
  } catch (e) {
    console.error('[idAnalyzerCallback] KycDocument upsert failed:', e.message);
    return Response.json({ error: 'KycDocument upsert failed: ' + e.message }, { status: 500 });
  }

  // Log warning if all 3 outputImage URLs are empty — indicates IDAnalyzer profile needs 'Return Output Image' enabled
  if (!frontUrl && !backUrl && !faceUrl) {
    console.warn('[idAnalyzerCallback] All outputImage URLs are empty — verify IDAnalyzer KYC Profile has "Return Output Image" enabled in settings');
  }

  // --- 6. Hydrate User with essential fields + auto-set verification status ---
  // This is SYNCHRONOUS (before returning 200) because the frontend polls for these fields.
  // Wrap in try-catch; return 500 on error so IDAnalyzer retries.
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

    // Wallet tier upgrade & AuditLog (SYNCHRONOUS before returning 200)
    if (decision === 'accept') {
      const tierUpgradeResult = await upgradeWalletTier(base44, userId);
      if (!tierUpgradeResult?.success === false) {
        console.error('[idAnalyzerCallback] Wallet tier upgrade FAILED during KYC approval');
        await base44.asServiceRole.entities.AuditLog.create({
          user_id: userId,
          action: 'wallet_tier_upgrade_failed',
          description: `Wallet tier upgrade failed during KYC approval: ${tierUpgradeResult?.error || 'unknown error'}`,
        });
      }
    }
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: userId,
      action: 'idanalyzer_docupass_completed',
      entity_type: 'KycDocument',
      description: `DocuPass ${decision}. Tx: ${transactionId}. Face: ${faceConfidence}, Auth: ${authScore}. Report: ${auditReportUrl ? 'stored' : 'none'}`,
      new_values: { decision, transactionId, faceConfidence, auditReportUrl },
    });
  } catch (e) {
    console.error('[idAnalyzerCallback] User hydration or audit failed:', e.message);
    return Response.json({ error: 'Hydration failed: ' + e.message }, { status: 500 });
  }

  // --- SMS notification (fire-and-forget, acceptable to lose) ---
  sendKycSms(base44, userId, decision).catch(() => {});

  // --- Return 200 immediately ---
  // Per IDAnalyzer docs: "Your endpoint must return HTTP 200 within 10 seconds."
  return Response.json({ success: true, status: docStatus, decision });
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
      return { success: true };
    }
    return { success: false, error: 'No personal wallet found' };
  } catch (e) {
    console.warn('[idAnalyzerCallback] Wallet upgrade failed:', e.message);
    return { success: false, error: e.message };
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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Admin recovery tool: fetches a completed IDAnalyzer DocuPass transaction
 * by transactionId from the IDAnalyzer vault and processes it through the
 * same pipeline as idAnalyzerCallback v3 (field extraction, KycDocument upsert,
 * User hydration with pending_confirmation on accept).
 *
 * Bypasses signature verification (admin-initiated).
 * Force-overwrites existing KycDocuments (intentional recovery).
 *
 * On accept: sets kyc_status='pending_confirmation' and overwrites profile
 * fields. The user must then confirm their details via confirmKycDetails.
 * Does NOT push to SasaPay or upgrade wallet — that happens on user confirmation.
 *
 * Requires: super_admin or bodasure_staff role.
 * Requires: IDANALYZER_API_KEY secret.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin' && user.role !== 'bodasure_staff') {
      return Response.json({ error: 'Forbidden — super_admin or bodasure_staff only' }, { status: 403 });
    }

    const { transactionId, userId } = await req.json();
    if (!transactionId || !userId) {
      return Response.json({ error: 'transactionId and userId are required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('IDANALYZER_API_KEY');
    if (!apiKey) return Response.json({ error: 'IDANALYZER_API_KEY not configured' }, { status: 500 });

    console.log(`[replayDocupassWebhook] Fetching transaction ${transactionId} for user ${userId}`);

    const response = await fetch(`https://api2.idanalyzer.com/transaction/${transactionId}`, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[replayDocupassWebhook] IDAnalyzer API error ${response.status}: ${errText}`);
      return Response.json({ error: `IDAnalyzer API error (${response.status}): ${errText}` }, { status: 502 });
    }

    const transaction = await response.json();
    console.log(`[replayDocupassWebhook] Transaction fetched. Decision: ${transaction.decision}`);

    const result = await processTransaction(base44, transaction, userId, user.id);
    return Response.json(result);
  } catch (error) {
    console.error('[replayDocupassWebhook] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ---------------------------------------------------------------------------
// Processing pipeline (mirrors idAnalyzerCallback v3)
// ---------------------------------------------------------------------------

async function processTransaction(base44, payload, userId, adminUserId) {
  const sr = base44.asServiceRole;
  const transactionId = payload.transactionId || payload.id || 'unknown';
  const decision = payload.decision;

  if (!decision) {
    return { success: false, error: 'No decision in transaction response', transactionId };
  }

  const statusMap = { accept: 'approved', review: 'pending', reject: 'rejected' };
  const docStatus = statusMap[decision] || 'pending';

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

  const scores = payload.scores || {};
  const faceConfidence = scores.faceCompare != null ? scores.faceCompare : null;
  const faceIsIdentical = faceConfidence != null ? faceConfidence >= 0.7 : null;

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

  const outputFile = payload.outputFile || [];
  const auditReport = outputFile.find(f =>
    (f.name && f.name.toLowerCase().includes('audit')) ||
    (f.fileName && f.fileName.toLowerCase().endsWith('.pdf')) ||
    (f.fileName && f.fileName.toLowerCase().includes('audit'))
  );
  const auditReportUrl = auditReport?.fileUrl || null;

  const extractedData = {
    fields, extraFields,
    face: { confidence: faceConfidence, isIdentical: faceIsIdentical },
    authentication: { score: authScore, antiForgeryOnly: true },
    warnings: warnings.map(w => ({ code: w.code, description: w.description, severity: w.severity, decision: w.decision })),
    transactionId, decision, auditReportUrl,
  };

  const rejectionReason = decision === 'reject'
    ? (warnings[0]?.description || 'Verification rejected by IDAnalyzer')
    : null;

  // --- Upsert KycDocuments (force-overwrite) ---
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

  await Promise.all(docTypes.map(async ({ type, url }) => {
    const existing = existingDocs.find(d => d.document_type === type);
    const recordData = { ...upsertData, file_url: url || (existing?.file_url || '') };
    if (existing) {
      await sr.entities.KycDocument.update(existing.id, recordData);
    } else {
      await sr.entities.KycDocument.create({ user_id: userId, document_type: type, ...recordData });
    }
  }));

  // --- Hydrate User ---
  let userUpdate = {};
  try {
    const targetUser = await sr.entities.User.get(userId);
    userUpdate = {
      docupass_decision: decision,
      id_extracted_data: JSON.stringify(extractedData),
      docupass_report_fetched: true,
    };

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

    if (decision === 'accept') {
      // Set pending_confirmation and overwrite profile fields
      userUpdate.kyc_status = 'pending_confirmation';
      userUpdate.verification_complete = false;
      userUpdate.phone_verified = true;

      if (fieldValue('fullName')) {
        userUpdate.full_name = fieldValue('fullName');
        userUpdate.id_extracted_name = fieldValue('fullName');
      }
      if (fieldValue('dob')) {
        userUpdate.id_extracted_dob = normalizeDate(fieldValue('dob'));
        userUpdate.date_of_birth = normalizeDate(fieldValue('dob'));
      }
      if (fieldValue('documentNumber')) {
        userUpdate.national_id = fieldValue('documentNumber');
      }
      if (faceUrl) userUpdate.avatar_url = faceUrl;
    } else if (decision === 'reject') {
      userUpdate.kyc_status = 'rejected';
      userUpdate.verification_complete = false;
      userUpdate.kyc_attempts = (targetUser.kyc_attempts || 0) + 1;
    } else if (decision === 'review') {
      userUpdate.kyc_status = 'pending';
      userUpdate.verification_complete = false;
      userUpdate.account_state = 'KYC_REVIEW';
      userUpdate.account_state_updated_at = new Date().toISOString();
    }

    await sr.entities.User.update(userId, userUpdate);
  } catch (e) {
    console.warn('[replayDocupassWebhook] Failed to hydrate user:', e.message);
  }

  // --- AuditLog ---
  try {
    await sr.entities.AuditLog.create({
      user_id: userId,
      action: 'idanalyzer_docupass_replayed',
      entity_type: 'KycDocument',
      description: `DocuPass ${transactionId} replayed by admin ${adminUserId}. Decision: ${decision}. Face: ${faceConfidence}, Auth: ${authScore}.`,
      new_values: { decision, transactionId, faceConfidence, authScore, auditReportUrl },
    });
  } catch (e) {
    console.warn('[replayDocupassWebhook] AuditLog failed:', e.message);
  }

  // --- SMS notification (reject only) ---
  if (decision === 'reject') {
    sendKycSms(base44, userId, decision).catch(e =>
      console.warn('[replayDocupassWebhook] SMS failed:', e.message)
    );
  }

  return {
    success: true,
    transactionId,
    decision,
    docStatus,
    extractedName: fieldValue('fullName'),
    nationalId: fieldValue('documentNumber'),
    dob: fieldValue('dob') ? normalizeDate(fieldValue('dob')) : null,
    sex: fieldValue('sex'),
    faceConfidence,
    faceIsIdentical,
    authScore,
    matchRate,
    auditReportUrl,
    warnings: warnings.map(w => w.code),
    processedAt: new Date().toISOString(),
    note: decision === 'accept'
      ? 'User set to pending_confirmation — they must confirm details in the app to complete verification.'
      : undefined,
  };
}

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
    if (typeof first === 'object') return { value: first.value ?? null, confidence: first.confidence ?? null };
    return { value: first, confidence: null };
  }
  if (typeof field === 'object') return { value: field.value ?? null, confidence: field.confidence ?? null };
  return null;
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = String(dateStr).replace(/\//g, '-');
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.substring(0, 10);
  const parts = cleaned.split('-');
  if (parts.length === 3 && parts[2].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return cleaned.substring(0, 10);
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
      eventType: templateKey, metadata: { decision, userId, replay: true },
    });
  } catch (error) {
    console.error('[replayDocupassWebhook] SMS failed: ' + error.message);
  }
}
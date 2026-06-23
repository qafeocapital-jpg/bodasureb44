import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * V2: Batched ID Analyzer submission.
 * Sends ID front + ID back + selfie to ID Analyzer v2 API in a single flow.
 * - /v5/verify_document: OCR + document authenticity (ID front + back)
 * - /v5/verify_facematch: face match between ID photo and selfie
 * Total: 2 API calls (down from 3+ per-document calls).
 *
 * Payload: { idFrontUrl, idBackUrl, selfieUrl }
 * Returns: { success, decision: 'accept'|'review'|'reject', extractedData, faceConfidence }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { idFrontUrl, idBackUrl, selfieUrl } = await req.json();
    if (!idFrontUrl || !idBackUrl || !selfieUrl) {
      return Response.json({ error: 'Missing idFrontUrl, idBackUrl, or selfieUrl' }, { status: 400 });
    }

    const apiKey = Deno.env.get('IDANALYZER_API_KEY');
    if (!apiKey) throw new Error('IDANALYZER_API_KEY not configured');
    const profileId = Deno.env.get('IDANALYZER_PROFILE_ID');

    // Download and encode all 3 images in parallel
    const [frontBase64, backBase64, selfieBase64] = await Promise.all([
      downloadAndEncodeImage(idFrontUrl),
      downloadAndEncodeImage(idBackUrl),
      downloadAndEncodeImage(selfieUrl),
    ]);

    // Call 1: Document verification (OCR + authenticity) — ID front + back
    const docPayload = {
      document_primary: { country: 'KE', document_type: 'national_id' },
      document_primary_image: frontBase64,
      document_secondary_image: backBase64,
    };
    if (profileId) docPayload.profile = profileId;

    const docResponse = await fetch('https://api2.idanalyzer.com/v5/verify_document', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(docPayload),
    });
    const docResult = await docResponse.json();
    const docStatus = docResult.status || (docResult.error ? 'failure' : 'review');

    // Call 2: Face match (ID photo vs selfie)
    let faceConfidence = 0;
    try {
      const faceResponse = await fetch('https://api2.idanalyzer.com/v5/verify_facematch', {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_image: frontBase64, selfie_image: selfieBase64 }),
      });
      const faceResult = await faceResponse.json();
      faceConfidence = faceResult.result?.face?.confidence ?? faceResult.confidence ?? 0;
    } catch (e) {
      console.warn('Face match failed:', e.message);
    }

    // Determine overall decision
    let decision;
    if (docStatus === 'success' && faceConfidence >= 0.7) {
      decision = 'accept';
    } else if (docStatus === 'failure') {
      decision = 'reject';
    } else {
      decision = 'review';
    }

    // Extract data from document verification result
    const extractedData = extractDataFromV2(docResult);
    const kycStatus = decision === 'accept' ? 'approved' : decision === 'reject' ? 'rejected' : 'pending';
    const providerRef = docResult.id || `idanalyzer_v2_${Date.now()}`;

    const sr = base44.asServiceRole;
    const docTypes = ['id_front', 'id_back', 'selfie'];
    const urls = { id_front: idFrontUrl, id_back: idBackUrl, selfie: selfieUrl };

    // Fetch existing docs for this user (batch)
    const existingDocs = await sr.entities.KycDocument.filter({ user_id: user.id });

    // Batch update all 3 KycDocuments in parallel
    await Promise.all(docTypes.map(async (docType) => {
      const existing = existingDocs.find(d => d.document_type === docType);
      const updateData = {
        user_id: user.id,
        document_type: docType,
        file_url: urls[docType],
        status: kycStatus,
        provider_name: 'idanalyzer_v2',
        provider_reference: providerRef,
      };
      if (kycStatus === 'approved') {
        updateData.reviewed_at = new Date().toISOString();
      }
      if (kycStatus === 'rejected') {
        updateData.rejection_reason = docResult.error?.message || 'Document verification failed';
      }
      if (existing) {
        await sr.entities.KycDocument.update(existing.id, updateData);
      } else {
        await sr.entities.KycDocument.create(updateData);
      }
    }));

    // Hydrate user profile — store in separate fields to avoid name reversion bug
    if (Object.keys(extractedData).length > 0) {
      const userUpdate = {};
      if (extractedData.fullName) userUpdate.id_extracted_name = extractedData.fullName;
      if (extractedData.dob) userUpdate.id_extracted_dob = extractedData.dob;
      if (extractedData.documentNumber && !user.national_id) {
        userUpdate.national_id = extractedData.documentNumber;
      }
      if (Object.keys(userUpdate).length > 0) {
        await sr.entities.User.update(user.id, userUpdate);
      }
    }

    return Response.json({
      success: true,
      decision,
      extractedData,
      faceConfidence,
      docStatus,
    });
  } catch (error) {
    console.error('idAnalyzerSubmit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function downloadAndEncodeImage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download image: ${url}`);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function extractDataFromV2(result) {
  const extracted = {};
  const doc = result.result?.document || {};
  const name = result.result?.name || {};

  const firstName = name.first_name || doc.first_name || '';
  const lastName = name.last_name || doc.last_name || '';
  if (firstName || lastName) {
    extracted.fullName = `${firstName} ${lastName}`.trim();
  }

  if (doc.number || result.result?.document_number) {
    extracted.documentNumber = doc.number || result.result.document_number;
  }

  if (result.result?.date_of_birth?.raw || doc.date_of_birth) {
    extracted.dob = result.result?.date_of_birth?.raw || doc.date_of_birth;
  }

  return extracted;
}
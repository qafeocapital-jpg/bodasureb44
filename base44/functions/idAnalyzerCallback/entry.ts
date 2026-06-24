import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Webhook callback handler for ID Analyzer v2 results.
 * Handles BOTH:
 *  - Legacy async scan results (idAnalyzerSubmit) — KycDocuments exist with provider_reference = id
 *  - DocuPass hosted flow results — KycDocuments may not exist yet; creates them using reference (user_id)
 *
 * Validates a shared-secret query parameter.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const secret = Deno.env.get('IDANALYZER_WEBHOOK_SECRET');
    if (!secret) {
      return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    const providedSecret = new URL(req.url).searchParams.get('secret');
    if (providedSecret !== secret) {
      return Response.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    const payload = await req.json();
    const { id, status, result, results, user_reference, reference, customData } = payload;
    const data = result || results;
    const userRef = customData || reference || user_reference;

    if (!id || !status) {
      return Response.json({ error: 'Missing required fields: id, status' }, { status: 400 });
    }

    // Try to find existing KycDocuments by provider_reference (legacy scan flow)
    let kycDocuments = await base44.asServiceRole.entities.KycDocument.filter({
      provider_reference: id,
    });

    let userId;
    if (kycDocuments.length > 0) {
      // Legacy flow: documents already exist
      userId = kycDocuments[0].user_id;
    } else if (userRef) {
      // DocuPass flow: use reference (user_id) to identify the user
      userId = userRef;
    }

    if (!userId) {
      console.warn(`No user found for id: ${id}, reference: ${userRef}`);
      return Response.json({ success: true, message: 'No user reference found, silently accepted' });
    }

    const docStatus = status === 'success' ? 'approved' : status === 'failure' ? 'rejected' : 'pending';
    const updateData = {
      status: docStatus,
      provider_name: 'idanalyzer_docupass',
      provider_reference: id,
    };
    if (status === 'success') {
      updateData.reviewed_at = new Date().toISOString();
    }
    if (status === 'failure' && (payload.error || data?.error)) {
      updateData.rejection_reason = payload.error?.message || payload.error || data?.error?.message || 'Verification failed';
    }

    // Fetch existing docs for this user (to upsert)
    const existingDocs = await base44.asServiceRole.entities.KycDocument.filter({ user_id: userId });
    const docTypes = ['id_front', 'id_back', 'selfie'];

    // Upsert all 3 document types
    await Promise.all(docTypes.map(async (docType) => {
      const existing = existingDocs.find(d => d.document_type === docType);
      if (existing) {
        await base44.asServiceRole.entities.KycDocument.update(existing.id, updateData);
      } else {
        await base44.asServiceRole.entities.KycDocument.create({
          user_id: userId,
          document_type: docType,
          file_url: '',
          ...updateData,
        });
      }
    }));

    // Hydrate user data if approved
    if (status === 'success' && data) {
      const user = await base44.asServiceRole.entities.User.get(userId);
      if (user) {
        const extractedData = extractDataFromV2(data);
        const userUpdate = {};
        if (extractedData.fullName) userUpdate.id_extracted_name = extractedData.fullName;
        if (extractedData.dob) userUpdate.id_extracted_dob = extractedData.dob;
        if (extractedData.documentNumber && !user.national_id) {
          userUpdate.national_id = extractedData.documentNumber;
        }
        if (Object.keys(userUpdate).length > 0) {
          await base44.asServiceRole.entities.User.update(userId, userUpdate);
        }
      }
    }

    return Response.json({ success: true, status: docStatus });
  } catch (error) {
    console.error('idAnalyzerCallback error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function extractDataFromV2(data) {
  const extracted = {};
  const doc = data?.document || {};
  const name = data?.name || doc?.name || {};

  const firstName = name.first_name || doc.first_name || data?.first_name || '';
  const lastName = name.last_name || doc.last_name || data?.last_name || '';
  if (firstName || lastName) {
    extracted.fullName = `${firstName} ${lastName}`.trim();
  }

  if (doc.number || data?.document_number || data?.id_number) {
    extracted.documentNumber = doc.number || data.document_number || data.id_number;
  }

  if (data?.date_of_birth?.raw || doc.date_of_birth || data?.dob) {
    extracted.dob = data?.date_of_birth?.raw || doc.date_of_birth || data?.dob;
  }

  return extracted;
}
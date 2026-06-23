import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Webhook callback handler for ID Analyzer v2 results.
 * Called by ID Analyzer after async document processing completes.
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
    // v2 uses 'result' (singular); v1 used 'results' (plural)
    const { id, status, result, results, user_reference } = payload;
    const data = result || results;

    if (!id || !status || !user_reference) {
      return Response.json({ error: 'Missing required fields: id, status, user_reference' }, { status: 400 });
    }

    const kycDocuments = await base44.asServiceRole.entities.KycDocument.filter({
      provider_reference: id,
    });

    if (kycDocuments.length === 0) {
      console.warn(`No KycDocument found for provider_reference: ${id}`);
      return Response.json({ success: true, message: 'Document not found, silently accepted' });
    }

    const docStatus = status === 'success' ? 'approved' : status === 'failure' ? 'rejected' : 'pending';
    const updateData = { status: docStatus };
    if (status === 'failure' && payload.error) {
      updateData.rejection_reason = payload.error;
    }

    // Update all matching documents
    await Promise.all(kycDocuments.map(doc =>
      base44.asServiceRole.entities.KycDocument.update(doc.id, updateData)
    ));

    // Hydrate user data if approved
    if (status === 'success' && data) {
      const userId = kycDocuments[0].user_id;
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
  const name = data?.name || {};

  const firstName = name.first_name || doc.first_name || '';
  const lastName = name.last_name || doc.last_name || '';
  if (firstName || lastName) {
    extracted.fullName = `${firstName} ${lastName}`.trim();
  }

  if (doc.number || data?.document_number) {
    extracted.documentNumber = doc.number || data.document_number;
  }

  if (data?.date_of_birth?.raw || doc.date_of_birth) {
    extracted.dob = data?.date_of_birth?.raw || doc.date_of_birth;
  }

  return extracted;
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Webhook callback handler for ID Analyzer results.
 * Called by ID Analyzer after document processing completes.
 *
 * Validates a shared-secret query parameter (not a cryptographic signature —
 * ID Analyzer's legacy API does not sign webhooks). The secret must match
 * the IDANALYZER_WEBHOOK_SECRET environment variable.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Validate webhook secret passed as query param
    const secret = Deno.env.get('IDANALYZER_WEBHOOK_SECRET');
    if (!secret) {
      return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    const providedSecret = new URL(req.url).searchParams.get('secret');
    if (providedSecret !== secret) {
      return Response.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    const payload = await req.json();
    const { id, status, results, user_reference } = payload;

    if (!id || !status || !user_reference) {
      return Response.json({ error: 'Missing required fields: id, status, user_reference' }, { status: 400 });
    }

    // Find KycDocument by provider_reference (the ID Analyzer transaction id)
    const kycDocuments = await base44.asServiceRole.entities.KycDocument.filter({
      provider_reference: id,
    });

    if (kycDocuments.length === 0) {
      console.warn(`No KycDocument found for provider_reference: ${id}`);
      return Response.json({ success: true, message: 'Document not found, silently accepted' });
    }

    const kycDoc = kycDocuments[0];
    const docStatus = status === 'success' ? 'approved' : status === 'failure' ? 'rejected' : 'pending';

    // Update KycDocument with result
    const updateData = { status: docStatus };
    if (status === 'failure' && payload.error) {
      updateData.rejection_reason = payload.error;
    }

    await base44.asServiceRole.entities.KycDocument.update(kycDoc.id, updateData);

    // Extract and hydrate User data if approved
    if (status === 'success' && results) {
      const user = await base44.asServiceRole.entities.User.get(kycDoc.user_id);
      if (user) {
        const extractedData = extractUserDataFromIDAnalyzer(results);
        if (Object.keys(extractedData).length > 0) {
          await base44.asServiceRole.entities.User.update(kycDoc.user_id, extractedData);
        }
      }
    }

    return Response.json({ success: true, status: docStatus });
  } catch (error) {
    console.error('idAnalyzerCallback error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function extractUserDataFromIDAnalyzer(results) {
  if (!results) return {};

  const extracted = {};

  const firstName = results.name?.first_name || '';
  const lastName = results.name?.last_name || '';
  if (firstName || lastName) {
    extracted.full_name = `${firstName} ${lastName}`.trim();
  }

  if (results.date_of_birth?.raw) {
    extracted.date_of_birth = results.date_of_birth.raw;
  }

  if (results.document_number) {
    extracted.national_id = results.document_number;
  }

  if (results.document_type) {
    const docTypeMap = { 'ID Card': 'id_card', 'Passport': 'passport', 'Alien ID': 'alien_id' };
    extracted.document_type = docTypeMap[results.document_type] || 'id_card';
  }

  if (results.address?.raw) {
    extracted.physical_address = results.address.raw;
  }

  return extracted;
}
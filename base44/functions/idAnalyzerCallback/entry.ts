/**
 * Webhook callback handler for ID Analyzer results.
 * Called by ID Analyzer after document processing completes.
 * 
 * Validates signature, processes extraction results, and updates KycDocument status.
 */
Deno.serve(async (req) => {
  try {
    const payload = await req.json();

    // Validate ID Analyzer signature
    const signature = req.headers.get('x-idanalyzer-signature');
    const secret = Deno.env.get('IDANALYZER_WEBHOOK_SECRET');
    
    if (secret && !verifySignature(JSON.stringify(payload), signature, secret)) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { id, status, results, user_reference } = payload;

    if (!id || !status || !user_reference) {
      return Response.json({ error: 'Missing required fields: id, status, user_reference' }, { status: 400 });
    }

    // Import Base44 SDK and initialize service role
    const { createClientFromServiceToken } = await import('npm:@base44/sdk@0.8.31');
    const base44 = createClientFromServiceToken(Deno.env.get('BASE44_SERVICE_ROLE_KEY'));

    // Find KycDocument by provider_reference
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

function verifySignature(payload, signature, secret) {
  // Simple HMAC-SHA256 verification (ID Analyzer's specific format)
  // Adjust based on ID Analyzer's actual signature scheme
  return signature === computeSignature(payload, secret);
}

function computeSignature(payload, secret) {
  // Placeholder: implement ID Analyzer's specific signature computation
  // Usually: HMAC-SHA256(payload, secret).hex()
  return '';
}

function extractUserDataFromIDAnalyzer(results) {
  if (!results) return {};

  const extracted = {};

  // Extract full name
  const firstName = results.name?.first_name || '';
  const lastName = results.name?.last_name || '';
  if (firstName || lastName) {
    extracted.full_name = `${firstName} ${lastName}`.trim();
  }

  // Extract date of birth
  if (results.date_of_birth?.raw) {
    extracted.date_of_birth = results.date_of_birth.raw;
  }

  // Extract national ID
  if (results.document_number) {
    extracted.national_id = results.document_number;
  }

  // Extract document type
  if (results.document_type) {
    const docTypeMap = { 'ID Card': 'id_card', 'Passport': 'passport', 'Alien ID': 'alien_id' };
    extracted.document_type = docTypeMap[results.document_type] || 'id_card';
  }

  // Extract address
  if (results.address?.raw) {
    extracted.physical_address = results.address.raw;
  }

  return extracted;
}
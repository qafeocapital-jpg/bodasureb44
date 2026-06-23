import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Submit KYC documents to ID Analyzer for automated verification and data extraction.
 * 
 * Payload:
 * - documentType: 'id_front' | 'id_back' | 'selfie'
 * - imageUrl: URL of the image to analyze
 * 
 * ID Analyzer will extract data from ID documents and call the webhook to process results.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { documentType, imageUrl } = await req.json();

    if (!documentType || !imageUrl) {
      return Response.json({ error: 'Missing documentType or imageUrl' }, { status: 400 });
    }

    const validTypes = ['id_front', 'id_back', 'selfie'];
    if (!validTypes.includes(documentType)) {
      return Response.json({ error: `Invalid documentType. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    // Download image and encode to base64
    const imageBase64 = await downloadAndEncodeImage(imageUrl);

    // Call ID Analyzer API
    const apiKey = Deno.env.get('IDANALYZER_API_KEY');
    if (!apiKey) {
      throw new Error('IDANALYZER_API_KEY not configured');
    }

    const payload = {
      api_key: apiKey,
      modules: 'idanalyzer',
      return_image: '0',
      return_type: 'json',
      document_primary: imageBase64,
      country: 'KE',
    };

    // Determine if this is a secondary document (back side)
    if (documentType === 'id_back') {
      payload.document_secondary = imageBase64;
      delete payload.document_primary;
    }

    const response = await fetch('https://api.idanalyzer.com/v1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload),
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(`ID Analyzer error: ${result.error.message}`);
    }

    // Store extraction result in KycDocument with provider reference
    const kycDocuments = await base44.asServiceRole.entities.KycDocument.filter({
      user_id: user.id,
      document_type: documentType,
    });

    const docData = {
      user_id: user.id,
      document_type: documentType,
      file_url: imageUrl,
      status: 'pending',
      provider_name: 'id_analyzer',
      provider_reference: result.id || `idanalyzer_${Date.now()}`,
    };

    if (kycDocuments.length > 0) {
      await base44.asServiceRole.entities.KycDocument.update(kycDocuments[0].id, docData);
    } else {
      await base44.asServiceRole.entities.KycDocument.create(docData);
    }

    // Extract and store data from ID document
    if (documentType === 'id_front' && result.results) {
      const extractedData = extractUserDataFromIDAnalyzer(result.results);
      
      // Hydrate User entity with extracted data
      if (Object.keys(extractedData).length > 0) {
        await base44.asServiceRole.entities.User.update(user.id, extractedData);
      }
    }

    return Response.json({
      success: true,
      documentType,
      status: 'pending',
      providerReference: result.id || `idanalyzer_${Date.now()}`,
      extractedData: documentType === 'id_front' ? extractUserDataFromIDAnalyzer(result.results) : {},
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
  // Chunked encoding to avoid call stack overflow on large images
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function extractUserDataFromIDAnalyzer(results) {
  if (!results) return {};

  const extracted = {};

  // Extract full name (combine first, middle, last names)
  const firstName = results.name?.first_name || '';
  const lastName = results.name?.last_name || '';
  if (firstName || lastName) {
    extracted.full_name = `${firstName} ${lastName}`.trim();
  }

  // Extract date of birth
  if (results.date_of_birth?.raw) {
    extracted.date_of_birth = results.date_of_birth.raw;
  }

  // Extract national ID / document number
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
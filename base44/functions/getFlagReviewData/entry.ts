import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Fetches all review data for a flag review drawer.
 * Super admin only. No external API calls — reads only stored entity data.
 *
 * Payload: { userId, vehicleId? }
 * Returns: { rider, kycDocs, vehicle, idAnalyzerSignals }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const userRoles = new Set(user?.roles || []);
    if (user?.role) userRoles.add(user.role);
    if (!userRoles.has('super_admin')) {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const { userId, vehicleId } = await req.json();
    if (!userId) {
      return Response.json({ error: 'userId required' }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    const rider = await sr.entities.User.get(userId);
    if (!rider) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const kycDocs = await sr.entities.KycDocument.filter({ user_id: userId });

    let vehicle = null;
    let countyName = '';
    if (vehicleId) {
      vehicle = await sr.entities.Vehicle.get(vehicleId);
      if (vehicle?.county_id) {
        try {
          const counties = await sr.entities.County.filter({ id: vehicle.county_id });
          if (counties.length > 0) countyName = counties[0].name;
        } catch { /* county lookup optional */ }
      }
    }

    // Derive ID Analyzer signals from stored fields
    const idAnalyzerDoc = kycDocs.find((d) => d.provider_name === 'idanalyzer_v2');
    let idAnalyzerSignals = null;
    if (idAnalyzerDoc) {
      const decisionMap = { pending: 'review', approved: 'accept', rejected: 'reject' };
      idAnalyzerSignals = {
        decision: decisionMap[idAnalyzerDoc.status] || 'review',
        faceConfidence: null,
        extractedName: rider.id_extracted_name || null,
        extractedDob: rider.id_extracted_dob || null,
        documentNumber: rider.national_id || null,
        providerReference: idAnalyzerDoc.provider_reference || null,
      };
    }

    return Response.json({
      rider: {
        id: rider.id,
        full_name: rider.full_name,
        phone: rider.phone,
        email: rider.email,
        kyc_status: rider.kyc_status,
        national_id: rider.national_id,
      },
      kycDocs,
      vehicle: vehicle ? { ...vehicle, county_name: countyName } : null,
      idAnalyzerSignals,
    });
  } catch (error) {
    console.error('getFlagReviewData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
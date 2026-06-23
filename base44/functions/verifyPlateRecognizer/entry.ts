import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Verify a bike photo using Platerecognizer ANPR API.
 * Compares the plate detected in the photo against the rider's registered plate.
 * Uses Levenshtein distance ≤ 1 for 1-char OCR tolerance.
 *
 * Payload: { imageUrl, expectedPlate }
 * Returns: { match, detectedPlate, score, reason }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { imageUrl, expectedPlate } = await req.json();
    if (!imageUrl || !expectedPlate) {
      return Response.json({ error: 'Missing imageUrl or expectedPlate' }, { status: 400 });
    }

    const token = Deno.env.get('PLATERECOGNIZER_API_TOKEN');
    if (!token) throw new Error('PLATERECOGNIZER_API_TOKEN not configured');

    // Normalize expected plate: uppercase, strip spaces/hyphens
    const normalizedExpected = expectedPlate.toUpperCase().replace(/[\s-]/g, '');

    // Call Platerecognizer ANPR API
    const formData = new FormData();
    formData.append('upload_url', imageUrl);
    formData.append('regions', 'ke');

    const response = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
      body: formData,
    });

    const result = await response.json();

    if (!result.results || result.results.length === 0) {
      return Response.json({
        match: false,
        detectedPlate: '',
        score: 0,
        reason: 'No number plate detected in photo. Please retake with the plate clearly visible.',
      });
    }

    // Find best match by score
    const best = result.results.reduce((a, b) => (a.score > b.score ? a : b));
    const detectedPlate = (best.plate || '').toUpperCase().replace(/[\s-]/g, '');
    const score = best.score || 0;

    if (score < 0.7) {
      return Response.json({
        match: false,
        detectedPlate,
        score,
        reason: `Plate detection confidence too low (${(score * 100).toFixed(0)}%). Please retake with the plate clearly visible.`,
      });
    }

    // Levenshtein distance check (allow 1-char OCR error)
    const distance = levenshtein(normalizedExpected, detectedPlate);
    if (distance > 1) {
      return Response.json({
        match: false,
        detectedPlate,
        score,
        reason: `Plate in photo (${detectedPlate}) doesn't match your registered plate (${normalizedExpected}). Please retake.`,
      });
    }

    return Response.json({ match: true, detectedPlate, score, reason: null });
  } catch (error) {
    console.error('verifyPlateRecognizer error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] : Math.min(d[i - 1][j - 1] + 1, d[i][j - 1] + 1, d[i - 1][j] + 1);
    }
  }
  return d[m][n];
}
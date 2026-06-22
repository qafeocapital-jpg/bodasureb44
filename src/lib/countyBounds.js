// Per-county bounding boxes for Kenya: [lng_min, lat_min, lng_max, lat_max]
// Used for geo-fencing stage pins to a rider's own county.
// Approximate — sufficient to prevent cross-county selection.

const COUNTY_BOUNDS = {
  'Kisumu': [33.8, -0.7, 35.1, 0.4],
  'Nairobi': [36.6, -1.4, 37.1, -0.9],
  'Mombasa': [39.5, -4.1, 39.8, -3.9],
  'Nakuru': [35.5, -1.3, 36.4, 0.0],
  'Kiambu': [36.5, -1.3, 37.1, 0.8],
  'Machakos': [37.0, -2.0, 37.9, -0.9],
  'Kakamega': [34.5, 0.1, 35.1, 0.9],
  'Bungoma': [34.3, 0.3, 34.9, 1.2],
  'Meru': [37.2, -0.1, 38.2, 0.8],
  'Nyeri': [36.5, -0.8, 37.1, 0.1],
  'Kericho': [35.0, -0.5, 35.8, 0.3],
  'Uasin Gishu': [34.8, 0.2, 35.6, 1.1],
  'Murang\'a': [36.5, -1.0, 37.1, 0.2],
  'Kisii': [34.5, -0.9, 35.0, -0.4],
  'Siaya': [33.8, -0.3, 34.6, 0.3],
  'Homa Bay': [34.0, -1.2, 34.7, -0.4],
  'Migori': [34.0, -1.3, 34.7, -0.6],
  'Trans Nzoia': [34.7, 0.7, 35.3, 1.2],
  'Bomet': [35.0, -0.8, 35.6, -0.2],
  'Laikipia': [36.2, -0.1, 37.0, 0.8],
  'Embu': [37.3, -0.8, 37.9, -0.3],
  'Kirinyaga': [37.1, -0.7, 37.6, -0.3],
  'Garissa': [39.0, -1.9, 40.5, 0.5],
  'Wajir': [39.5, 0.5, 41.0, 2.5],
  'Mandera': [40.0, 3.0, 42.0, 4.5],
  'Marsabit': [37.0, 1.0, 39.0, 4.5],
  'Isiolo': [37.0, -0.7, 38.5, 1.5],
  'Turkana': [34.5, 1.0, 36.8, 4.5],
  'West Pokot': [34.5, 0.7, 35.7, 1.5],
  'Samburu': [36.0, -0.5, 37.5, 2.0],
  'Baringo': [35.5, -0.2, 36.5, 1.3],
  'Elgeyo Marakwet': [35.2, 0.2, 35.8, 1.3],
  'Nandi': [34.8, -0.1, 35.4, 0.6],
  'Vihiga': [34.5, -0.1, 34.9, 0.5],
  'Busia': [33.9, -0.2, 34.5, 0.7],
  'Kwale': [39.0, -4.5, 39.8, -3.5],
  'Taita Taveta': [37.5, -4.2, 38.9, -2.5],
  'Kilifi': [39.0, -3.9, 39.8, -2.8],
  'Lamu': [40.5, -2.5, 41.5, -1.5],
  'Tana River': [38.5, -2.5, 40.0, -0.5],
  'Makueni': [37.3, -2.5, 38.3, -1.5],
  'Kitui': [37.5, -2.5, 39.0, -0.5],
  'Tharaka Nithi': [37.3, -0.6, 37.9, -0.1],
  'Nyandarua': [36.2, -0.8, 36.9, 0.2],
  'Narok': [35.0, -2.5, 36.3, -0.5],
  'Kajiado': [36.3, -3.5, 37.3, -1.3],
  'Nyamira': [34.5, -0.8, 34.9, -0.3],
};

// Kenya-wide fallback bounding box
const KENYA_BOUNDS = [33.5, -4.7, 42.0, 4.6];

export function getCountyBounds(countyName) {
  if (!countyName) return KENYA_BOUNDS;
  return COUNTY_BOUNDS[countyName] || KENYA_BOUNDS;
}

export function getCountyCenter(countyName) {
  const b = getCountyBounds(countyName);
  return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
}

export function isInCounty(lng, lat, countyName) {
  const b = getCountyBounds(countyName);
  return lng >= b[0] && lng <= b[2] && lat >= b[1] && lat <= b[3];
}

// Haversine distance in km between two [lat, lng] points
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
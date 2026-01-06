/**
 * Geofencing utilities for location verification
 */

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param {number} pointLat - Latitude of the point
 * @param {number} pointLng - Longitude of the point
 * @param {Array} polygon - Array of [lng, lat] coordinates
 * @returns {boolean} True if point is inside polygon
 */
function isPointInPolygon(pointLat, pointLng, polygon) {
  if (!polygon || !Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }

  let inside = false;
  const x = pointLng;
  const y = pointLat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if user is within location boundaries
 * Uses polygon boundaries if available, otherwise falls back to radius-based geofencing
 * @param {number} userLat - User's latitude
 * @param {number} userLng - User's longitude
 * @param {Object} location - Location object with boundaries, centerLat, centerLng, radiusMeters
 * @returns {boolean} True if user is within location boundaries
 */
function isWithinLocationBoundaries(userLat, userLng, location) {
  if (!location) return false;

  // If polygon boundaries are available, use them
  if (location.boundaries && Array.isArray(location.boundaries) && location.boundaries.length >= 3) {
    return isPointInPolygon(userLat, userLng, location.boundaries);
  }

  // Fallback to radius-based geofencing
  if (location.centerLat != null && location.centerLng != null && location.radiusMeters != null) {
    const distance = calculateDistance(userLat, userLng, location.centerLat, location.centerLng);
    return distance <= location.radiusMeters;
  }

  return false;
}

module.exports = {
  calculateDistance,
  isPointInPolygon,
  isWithinLocationBoundaries
};


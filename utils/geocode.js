const axios = require("axios");
const logger = require("../config/logger");

function invalidPoint() {
  return {
    type: "Point",
    coordinates: [0, 0]
  };
}

/**
 * Geocode an address to GeoJSON Point using OpenRouteService.
 * Falls back to Nominatim if ORS_API_KEY is not configured.
 * @param {string} address
 * @returns {Promise<{type: string, coordinates: [number, number]}>}
 */
async function geocodeAddress(address) {
  if (!address || typeof address !== "string" || !address.trim()) {
    return invalidPoint();
  }

  const trimmed = address.trim();
  const orsKey = process.env.ORS_API_KEY;

  // Primary: OpenRouteService geocoding
  if (orsKey) {
    try {
      const response = await axios.get("https://api.openrouteservice.org/geocode/search", {
        params: {
          api_key: orsKey,
          text: trimmed,
          size: 1
        },
        timeout: 10000
      });

      const feature = response.data?.features?.[0];
      if (feature && feature.geometry?.coordinates) {
        const [lon, lat] = feature.geometry.coordinates;
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
          return { type: "Point", coordinates: [lon, lat] };
        }
      }

      logger.warn({ address: trimmed }, "[geocode] ORS returned no results, trying Nominatim fallback");
    } catch (error) {
      logger.warn({ err: error.message, address: trimmed }, "[geocode] ORS geocode failed, trying Nominatim fallback");
    }
  }

  // Fallback: Nominatim (free, no key needed)
  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: trimmed,
        format: "json",
        limit: 1
      },
      headers: {
        "User-Agent": process.env.GEOCODER_USER_AGENT || "BikersHub/1.0 (server geocoder)",
        Accept: "application/json"
      },
      timeout: 10000
    });

    const result = Array.isArray(response.data) ? response.data[0] : null;
    if (!result) return invalidPoint();

    const lat = Number(result.lat);
    const lon = Number(result.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return invalidPoint();

    return { type: "Point", coordinates: [lon, lat] };
  } catch (error) {
    logger.error({ err: error.message }, "[geocode] All geocoding providers failed");
    return invalidPoint();
  }
}

module.exports = geocodeAddress;

const axios = require("axios");
const logger = require("../config/logger");

function invalidPoint() {
  return {
    type: "Point",
    coordinates: [0, 0]
  };
}

async function geocodeAddress(address) {
  if (!address || typeof address !== "string") {
    return invalidPoint();
  }

  try {
    const trimmed = address.trim();

    if (!trimmed) {
      return invalidPoint();
    }

    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: trimmed,
        format: "json",
        limit: 1
      },
      headers: {
        // Nominatim requires a descriptive User-Agent.
        "User-Agent": process.env.GEOCODER_USER_AGENT || "BikersHub/1.0 (server geocoder)",
        Accept: "application/json"
      },
      timeout: 10000
    });

    const result = Array.isArray(response.data) ? response.data[0] : null;

    if (!result) {
      return invalidPoint();
    }

    const lat = Number(result.lat);
    const lon = Number(result.lon);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return invalidPoint();
    }

    return {
      type: "Point",
      coordinates: [lon, lat]
    };
  } catch (error) {
    logger.error({ err: error.message }, "[geocode] Failed to geocode address");
    return invalidPoint();
  }
}

module.exports = geocodeAddress;

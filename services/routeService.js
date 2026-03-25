/**
 * OpenRouteService integration for Bikers Hub
 * Provides directions, geocoding, isochrones, and route optimization
 */

const axios = require("axios");
const logger = require("../config/logger");
const AppError = require("../utils/AppError");

const ORS_BASE = "https://api.openrouteservice.org";

function getApiKey() {
  const key = process.env.ORS_API_KEY;
  if (!key) {
    throw new AppError("ORS_API_KEY not configured", 500, "CONFIG_ERROR");
  }
  return key;
}

/**
 * Get driving directions between two or more waypoints
 * @param {Array<[number,number]>} coordinates - Array of [lng, lat] pairs
 * @param {string} profile - 'driving-car' | 'cycling-regular' | 'foot-walking'
 * @param {object} options - Extra options (instructions, geometry_simplify, etc.)
 * @returns {object} GeoJSON FeatureCollection with route geometry + properties
 */
exports.getDirections = async (coordinates, profile = "driving-car", options = {}) => {
  if (!coordinates || coordinates.length < 2) {
    throw new AppError("At least 2 waypoints are required", 400, "INVALID_INPUT");
  }

  const validProfiles = ["driving-car", "cycling-regular", "cycling-road", "foot-walking", "foot-hiking"];
  if (!validProfiles.includes(profile)) {
    throw new AppError(`Invalid profile: ${profile}`, 400, "INVALID_PROFILE");
  }

  try {
    const res = await axios.post(
      `${ORS_BASE}/v2/directions/${profile}/geojson`,
      {
        coordinates,
        instructions: options.instructions !== false,
        geometry_simplify: options.simplify !== false,
        elevation: options.elevation || false,
        language: options.language || "en",
        units: "km",
        ...(options.avoidFeatures ? { options: { avoid_features: options.avoidFeatures } } : {})
      },
      {
        headers: {
          Authorization: getApiKey(),
          "Content-Type": "application/json",
          Accept: "application/json, application/geo+json"
        },
        timeout: 15000
      }
    );

    return res.data;
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    logger.error({ err: msg, profile, waypointCount: coordinates.length }, "[ORS] Directions request failed");
    throw new AppError(`Route calculation failed: ${msg}`, 502, "ORS_ERROR");
  }
};

/**
 * Geocode an address string to coordinates
 * @param {string} text - Address or place name
 * @param {object} options - focus.point for biasing results
 * @returns {object} { lat, lng, label, confidence }
 */
exports.geocode = async (text, options = {}) => {
  if (!text || typeof text !== "string" || !text.trim()) {
    return null;
  }

  try {
    const params = {
      api_key: getApiKey(),
      text: text.trim(),
      size: 1,
      ...(options.focusLat && options.focusLng
        ? { "focus.point.lat": options.focusLat, "focus.point.lng": options.focusLng }
        : {})
    };

    const res = await axios.get(`${ORS_BASE}/geocode/search`, {
      params,
      timeout: 10000
    });

    const feature = res.data?.features?.[0];
    if (!feature) return null;

    const [lng, lat] = feature.geometry.coordinates;
    return {
      lat,
      lng,
      label: feature.properties?.label || text,
      confidence: feature.properties?.confidence || 0
    };
  } catch (error) {
    logger.error({ err: error.message }, "[ORS] Geocode failed");
    return null;
  }
};

/**
 * Reverse geocode coordinates to an address
 * @param {number} lat
 * @param {number} lng
 * @returns {object|null} { label, locality, region, country }
 */
exports.reverseGeocode = async (lat, lng) => {
  try {
    const res = await axios.get(`${ORS_BASE}/geocode/reverse`, {
      params: {
        api_key: getApiKey(),
        "point.lat": lat,
        "point.lon": lng,
        size: 1
      },
      timeout: 10000
    });

    const feature = res.data?.features?.[0];
    if (!feature) return null;

    const props = feature.properties || {};
    return {
      label: props.label || "",
      locality: props.locality || props.name || "",
      region: props.region || "",
      country: props.country || ""
    };
  } catch (error) {
    logger.error({ err: error.message }, "[ORS] Reverse geocode failed");
    return null;
  }
};

/**
 * Calculate isochrone (reachable area) from a point
 * @param {Array<[number,number]>} locations - [[lng, lat]]
 * @param {number[]} range - Distance in km or time in seconds
 * @param {string} rangeType - 'distance' | 'time'
 * @param {string} profile - Routing profile
 * @returns {object} GeoJSON FeatureCollection of isochrone polygons
 */
exports.getIsochrone = async (locations, range = [10], rangeType = "distance", profile = "driving-car") => {
  try {
    const rangeValues = rangeType === "distance"
      ? range.map(r => r * 1000) // km to meters
      : range; // seconds

    const res = await axios.post(
      `${ORS_BASE}/v2/isochrones/${profile}`,
      {
        locations,
        range: rangeValues,
        range_type: rangeType,
        smoothing: 25,
        area_units: "km"
      },
      {
        headers: {
          Authorization: getApiKey(),
          "Content-Type": "application/json",
          Accept: "application/json, application/geo+json"
        },
        timeout: 15000
      }
    );

    return res.data;
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    logger.error({ err: msg }, "[ORS] Isochrone request failed");
    throw new AppError(`Isochrone calculation failed: ${msg}`, 502, "ORS_ERROR");
  }
};

/**
 * Snap GPS coordinates to the nearest road (useful for cleaning ride tracks)
 * @param {Array<[number,number]>} coordinates - [[lng, lat], ...]
 * @param {string} profile - Routing profile
 * @returns {object} Snapped coordinates and route geometry
 */
exports.snapToRoads = async (coordinates, profile = "driving-car") => {
  if (!coordinates || coordinates.length < 2) {
    throw new AppError("At least 2 coordinates required", 400, "INVALID_INPUT");
  }

  // ORS snap endpoint uses match service — post coordinates to match/route
  try {
    const res = await axios.post(
      `${ORS_BASE}/v2/directions/${profile}/geojson`,
      {
        coordinates,
        geometry_simplify: false,
        instructions: false,
        radiuses: coordinates.map(() => 150) // 150m snap radius
      },
      {
        headers: {
          Authorization: getApiKey(),
          "Content-Type": "application/json",
          Accept: "application/json, application/geo+json"
        },
        timeout: 20000
      }
    );

    return res.data;
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    logger.error({ err: msg }, "[ORS] Snap to roads failed");
    throw new AppError(`Road snapping failed: ${msg}`, 502, "ORS_ERROR");
  }
};

/**
 * Get route summary (distance + duration) without full geometry
 * Used for quick estimates during ride creation
 * @param {Array<[number,number]>} coordinates - [[lng, lat], [lng, lat]]
 * @param {string} profile
 * @returns {{ distance: number, duration: number }} distance in km, duration in seconds
 */
exports.getRouteSummary = async (coordinates, profile = "driving-car") => {
  try {
    const res = await axios.post(
      `${ORS_BASE}/v2/directions/${profile}/json`,
      {
        coordinates,
        instructions: false,
        geometry: false
      },
      {
        headers: {
          Authorization: getApiKey(),
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    const summary = res.data?.routes?.[0]?.summary;
    if (!summary) {
      throw new AppError("No route found", 404, "NO_ROUTE");
    }

    return {
      distance: summary.distance / 1000, // meters to km
      duration: summary.duration // seconds
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    const msg = error.response?.data?.error?.message || error.message;
    logger.error({ err: msg }, "[ORS] Route summary failed");
    throw new AppError(`Route summary failed: ${msg}`, 502, "ORS_ERROR");
  }
};

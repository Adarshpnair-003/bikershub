/**
 * Route controller — OpenRouteService endpoints
 */

const routeService = require("../services/routeService");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");

/**
 * POST /api/routes/directions
 * Get driving directions between waypoints
 * Body: { coordinates: [[lng,lat],[lng,lat]], profile?, instructions?, elevation? }
 */
exports.getDirections = catchAsync(async (req, res) => {
  const { coordinates, profile, instructions, elevation, avoidFeatures } = req.body;
  const result = await routeService.getDirections(coordinates, profile, {
    instructions,
    elevation,
    avoidFeatures
  });
  res.json(apiResponse.success(result));
});

/**
 * GET /api/routes/geocode?text=...&focusLat=...&focusLng=...
 * Geocode an address string
 */
exports.geocode = catchAsync(async (req, res) => {
  const { text, focusLat, focusLng } = req.query;
  const result = await routeService.geocode(text, {
    focusLat: focusLat ? parseFloat(focusLat) : undefined,
    focusLng: focusLng ? parseFloat(focusLng) : undefined
  });

  if (!result) {
    return res.json(apiResponse.success(null, "No results found"));
  }

  res.json(apiResponse.success(result));
});

/**
 * GET /api/routes/reverse?lat=...&lng=...
 * Reverse geocode coordinates to address
 */
exports.reverseGeocode = catchAsync(async (req, res) => {
  const { lat, lng } = req.query;
  const result = await routeService.reverseGeocode(parseFloat(lat), parseFloat(lng));
  res.json(apiResponse.success(result));
});

/**
 * POST /api/routes/isochrone
 * Calculate reachable area from a point
 * Body: { location: [lng,lat], range: [10,20], rangeType: 'distance'|'time', profile? }
 */
exports.getIsochrone = catchAsync(async (req, res) => {
  const { location, range, rangeType, profile } = req.body;
  const result = await routeService.getIsochrone([location], range, rangeType, profile);
  res.json(apiResponse.success(result));
});

/**
 * POST /api/routes/snap
 * Snap GPS coordinates to nearest roads
 * Body: { coordinates: [[lng,lat],...], profile? }
 */
exports.snapToRoads = catchAsync(async (req, res) => {
  const { coordinates, profile } = req.body;
  const result = await routeService.snapToRoads(coordinates, profile);
  res.json(apiResponse.success(result));
});

/**
 * POST /api/routes/summary
 * Get quick distance + duration estimate
 * Body: { coordinates: [[lng,lat],[lng,lat]], profile? }
 */
exports.getRouteSummary = catchAsync(async (req, res) => {
  const { coordinates, profile } = req.body;
  const result = await routeService.getRouteSummary(coordinates, profile);
  res.json(apiResponse.success(result));
});

const rideService = require("../services/rideService");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");

exports.createRide = catchAsync(async (req, res) => {
  const ride = await rideService.create(req.user.id, req.body);
  res.status(201).json(apiResponse.success(ride, "Ride created"));
});

exports.getRides = catchAsync(async (req, res) => {
  const result = await rideService.getAll({ page: Number(req.query.page), limit: Number(req.query.limit) });
  res.json(apiResponse.success(result));
});

exports.getRide = catchAsync(async (req, res) => {
  const ride = await rideService.getById(req.params.rideId);
  res.json(apiResponse.success(ride));
});

exports.updateRide = catchAsync(async (req, res) => {
  const ride = await rideService.update(req.params.rideId, req.user.id, req.body);
  res.json(apiResponse.success(ride, "Ride updated"));
});

exports.deleteRide = catchAsync(async (req, res) => {
  await rideService.delete(req.params.rideId, req.user.id);
  res.json(apiResponse.success(null, "Ride deleted successfully"));
});

exports.joinRide = catchAsync(async (req, res) => {
  await rideService.join(req.params.rideId, req.user.id);
  res.json(apiResponse.success(null, "Joined ride successfully"));
});

exports.leaveRide = catchAsync(async (req, res) => {
  await rideService.leave(req.params.rideId, req.user.id);
  res.json(apiResponse.success(null, "Left ride successfully"));
});

exports.startRide = catchAsync(async (req, res) => {
  const ride = await rideService.start(req.params.rideId, req.user.id);
  res.json(apiResponse.success(ride, "Ride started"));
});

exports.updateLocation = catchAsync(async (req, res) => {
  const result = await rideService.updateLocation(req.params.rideId, req.user.id, req.body);
  res.json(apiResponse.success(result));
});

exports.endRide = catchAsync(async (req, res) => {
  const stats = await rideService.end(req.params.rideId, req.user.id);
  res.json(apiResponse.success(stats, "Ride ended"));
});

exports.getNearbyRides = catchAsync(async (req, res) => {
  const rides = await rideService.getNearby(req.query);
  res.json(apiResponse.success({ count: rides.length, rides }));
});

exports.getRideRoute = catchAsync(async (req, res) => {
  const result = await rideService.getRoute(req.params.rideId);
  res.json(apiResponse.success(result));
});

exports.getRideLocations = catchAsync(async (req, res) => {
  const locations = await rideService.getLocations(req.params.rideId);
  res.json(apiResponse.success(locations));
});

exports.inviteToRide = catchAsync(async (req, res) => {
  await rideService.invite(req.params.rideId, req.params.userId, req.user.id);
  res.json(apiResponse.success(null, "Ride invitation sent"));
});

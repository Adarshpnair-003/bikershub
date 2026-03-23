const Ride = require("../models/Ride");
const Notification = require("../models/Notification");
const Conversation = require("../models/Conversation");
const haversineDistance = require("../utils/distance");
const geocodeAddress = require("../utils/geocode");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const apiResponse = require("../utils/apiResponse");

/*
CREATE RIDE
*/
exports.createRide = catchAsync(async (req, res, next) => {
  const {
    title,
    description,
    startLocation,
    destination,
    rideDate,
    maxParticipants
  } = req.body;

  if (!title || !startLocation || !destination || !rideDate) {
    return next(new AppError("All required fields missing", 400, "VALIDATION_ERROR"));
  }

  const startCoords = await geocodeAddress(startLocation);
  const destinationCoords = await geocodeAddress(destination);

  if (startCoords.coordinates[0] === 0 && startCoords.coordinates[1] === 0) {
    return next(new AppError("Invalid start location", 400, "INVALID_LOCATION"));
  }

  if (destinationCoords.coordinates[0] === 0 && destinationCoords.coordinates[1] === 0) {
    return next(new AppError("Invalid destination", 400, "INVALID_LOCATION"));
  }

  const ride = await Ride.create({
    title,
    description,
    startLocation,
    startCoords,
    destination,
    destinationCoords,
    rideDate,
    maxParticipants,
    createdBy: req.user.id,
    participants: [req.user.id],
    participantsCount: 1
  });

  await Conversation.create({
    type: "ride",
    ride: ride._id,
    participants: [req.user.id]
  });

  res.status(201).json(apiResponse.success(ride, "Ride created"));
});

/*
GET ALL RIDES
*/
exports.getRides = catchAsync(async (req, res) => {
  const rides = await Ride.find()
    .populate("createdBy", "username")
    .sort({ rideDate: 1 });

  res.json(apiResponse.success(rides));
});

/*
GET SINGLE RIDE
*/
exports.getRide = catchAsync(async (req, res, next) => {
  const ride = await Ride.findById(req.params.rideId)
    .populate("createdBy", "username")
    .populate("participants", "username");

  if (!ride) return next(new AppError("Ride not found", 404, "NOT_FOUND"));

  res.json(apiResponse.success(ride));
});

/*
UPDATE RIDE
*/
exports.updateRide = catchAsync(async (req, res, next) => {
  const ride = await Ride.findById(req.params.rideId);

  if (!ride) return next(new AppError("Ride not found", 404, "NOT_FOUND"));

  if (ride.createdBy.toString() !== req.user.id)
    return next(new AppError("Not authorized", 403, "FORBIDDEN"));

  // Explicit field picks — no mass assignment
  const { title, description, startLocation, destination, rideDate, maxParticipants } = req.body;
  if (title !== undefined) ride.title = title;
  if (description !== undefined) ride.description = description;
  if (startLocation !== undefined) ride.startLocation = startLocation;
  if (destination !== undefined) ride.destination = destination;
  if (rideDate !== undefined) ride.rideDate = rideDate;
  if (maxParticipants !== undefined) ride.maxParticipants = maxParticipants;

  await ride.save();

  res.json(apiResponse.success(ride, "Ride updated"));
});

/*
JOIN RIDE
*/
exports.joinRide = catchAsync(async (req, res, next) => {
  const ride = await Ride.findById(req.params.rideId);

  if (!ride) return next(new AppError("Ride not found", 404, "NOT_FOUND"));

  if (ride.participants.map(p => p.toString()).includes(req.user.id))
    return next(new AppError("Already joined ride", 400, "ALREADY_JOINED"));

  if (ride.participants.length >= ride.maxParticipants)
    return next(new AppError("Ride is full", 400, "RIDE_FULL"));

  ride.participants.push(req.user.id);
  ride.participantsCount += 1;

  await ride.save();

  if (ride.createdBy.toString() !== req.user.id) {
    await Notification.create({
      recipient: ride.createdBy,
      sender: req.user.id,
      type: "ride_join",
      ride: ride._id
    });
  }

  res.json(apiResponse.success(null, "Joined ride successfully"));
});

/*
LEAVE RIDE
*/
exports.leaveRide = catchAsync(async (req, res, next) => {
  const ride = await Ride.findById(req.params.rideId);

  if (!ride) return next(new AppError("Ride not found", 404, "NOT_FOUND"));

  if (ride.createdBy.toString() === req.user.id)
    return next(new AppError("Creator cannot leave ride", 400, "CREATOR_CANNOT_LEAVE"));

  ride.participants = ride.participants.filter(
    id => id.toString() !== req.user.id
  );

  ride.participantsCount -= 1;

  await ride.save();

  res.json(apiResponse.success(null, "Left ride successfully"));
});

/*
GET LIVE LOCATIONS
*/
exports.getRideLocations = catchAsync(async (req, res, next) => {
  const ride = await Ride.findById(req.params.rideId)
    .populate("riderLocations.user", "username");

  if (!ride) return next(new AppError("Ride not found", 404, "NOT_FOUND"));

  res.json(apiResponse.success(ride.riderLocations));
});

/*
START RIDE
*/
exports.startRide = catchAsync(async (req, res, next) => {
  const ride = await Ride.findById(req.params.rideId);

  if (!ride) return next(new AppError("Ride not found", 404, "NOT_FOUND"));

  if (ride.createdBy.toString() !== req.user.id)
    return next(new AppError("Not authorized", 403, "FORBIDDEN"));

  ride.status = "live";
  ride.startTime = new Date();
  ride.route = { type: "LineString", coordinates: [] };

  await ride.save();

  res.json(apiResponse.success(null, "Ride started"));
});

/*
UPDATE LOCATION
*/
exports.updateLocation = catchAsync(async (req, res, next) => {
  const { lat, lng } = req.body;

  const ride = await Ride.findById(req.params.rideId);

  if (!ride || ride.status !== "live")
    return next(new AppError("Ride not active", 400, "RIDE_NOT_ACTIVE"));

  if (!ride.participants.map(p => p.toString()).includes(req.user.id)) {
    return next(new AppError("Not a ride participant", 403, "FORBIDDEN"));
  }

  ride.route.coordinates.push([lng, lat]);

  const coords = ride.route.coordinates;

  if (coords.length > 1) {
    const prev = coords[coords.length - 2];
    const curr = coords[coords.length - 1];

    const dist = haversineDistance(
      { lat: prev[1], lng: prev[0] },
      { lat: curr[1], lng: curr[0] }
    );

    ride.totalDistance += dist;
  }

  await ride.save();

  res.json(apiResponse.success({ totalDistance: ride.totalDistance }));
});

/*
END RIDE
*/
exports.endRide = catchAsync(async (req, res, next) => {
  const ride = await Ride.findById(req.params.rideId);

  if (!ride) return next(new AppError("Ride not found", 404, "NOT_FOUND"));

  if (ride.createdBy.toString() !== req.user.id)
    return next(new AppError("Not authorized", 403, "FORBIDDEN"));

  ride.status = "completed";
  ride.endTime = new Date();

  const duration = (ride.endTime - ride.startTime) / 1000;

  ride.rideDuration = duration;

  if (duration > 0) {
    ride.averageSpeed = (ride.totalDistance / duration) * 3600;
  }

  await ride.save();

  res.json(apiResponse.success({
    distance: ride.totalDistance,
    duration,
    avgSpeed: ride.averageSpeed
  }, "Ride ended"));
});

/*
NEARBY RIDES
*/
exports.getNearbyRides = catchAsync(async (req, res, next) => {
  const { lat, lng, radius = 10 } = req.query;

  if (!lat || !lng)
    return next(new AppError("Lat & Lng required", 400, "VALIDATION_ERROR"));

  const radiusInMeters = radius * 1000;

  const rides = await Ride.find({
    startCoords: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)]
        },
        $maxDistance: radiusInMeters
      }
    }
  }).limit(20);

  res.json(apiResponse.success({ count: rides.length, rides }));
});

/*
GET ROUTE (FOR GOOGLE MAPS)
*/
exports.getRideRoute = catchAsync(async (req, res, next) => {
  const ride = await Ride.findById(req.params.rideId);

  if (!ride)
    return next(new AppError("Ride not found", 404, "NOT_FOUND"));

  const route = ride.route?.coordinates.map(c => ({
    latitude: c[1],
    longitude: c[0]
  })) || [];

  res.json(apiResponse.success({
    route,
    totalDistance: ride.totalDistance,
    duration: ride.rideDuration,
    avgSpeed: ride.averageSpeed
  }));
});

/*
INVITE USER TO RIDE
*/
exports.inviteToRide = catchAsync(async (req, res, next) => {
  const ride = await Ride.findById(req.params.rideId);

  if (!ride)
    return next(new AppError("Ride not found", 404, "NOT_FOUND"));

  if (ride.createdBy.toString() !== req.user.id)
    return next(new AppError("Not authorized", 403, "FORBIDDEN"));

  await Notification.create({
    recipient: req.params.userId,
    sender: req.user.id,
    type: "ride_invite",
    ride: ride._id
  });

  res.json(apiResponse.success(null, "Ride invitation sent"));
});

/*
DELETE RIDE
*/
exports.deleteRide = catchAsync(async (req, res, next) => {
  const ride = await Ride.findById(req.params.rideId);

  if (!ride)
    return next(new AppError("Ride not found", 404, "NOT_FOUND"));

  if (ride.createdBy.toString() !== req.user.id)
    return next(new AppError("Not authorized", 403, "FORBIDDEN"));

  await ride.deleteOne();

  res.json(apiResponse.success(null, "Ride deleted successfully"));
});

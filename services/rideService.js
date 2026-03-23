const Ride = require("../models/Ride");
const Notification = require("../models/Notification");
const Conversation = require("../models/Conversation");
const geocodeAddress = require("../utils/geocode");
const haversineDistance = require("../utils/distance");
const AppError = require("../utils/AppError");

exports.create = async (creatorId, data) => {
  const { title, description, startLocation, destination, rideDate, maxParticipants } = data;

  const startCoords = await geocodeAddress(startLocation);
  if (startCoords.coordinates[0] === 0 && startCoords.coordinates[1] === 0) {
    throw new AppError("Invalid start location", 400, "INVALID_LOCATION");
  }

  const destinationCoords = await geocodeAddress(destination);
  if (destinationCoords.coordinates[0] === 0 && destinationCoords.coordinates[1] === 0) {
    throw new AppError("Invalid destination", 400, "INVALID_LOCATION");
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
    createdBy: creatorId,
    participants: [creatorId],
    participantsCount: 1
  });

  await Conversation.create({
    type: "ride",
    ride: ride._id,
    participants: [creatorId]
  });

  return ride;
};

exports.getAll = async ({ page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [rides, total] = await Promise.all([
    Ride.find().populate("createdBy", "username profilePic").sort({ rideDate: 1 }).skip(skip).limit(limit).lean(),
    Ride.countDocuments()
  ]);
  return { rides, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

exports.getById = async (rideId) => {
  const ride = await Ride.findById(rideId)
    .populate("createdBy", "username profilePic")
    .populate("participants", "username profilePic")
    .lean();
  if (!ride) throw new AppError("Ride not found", 404, "NOT_FOUND");
  return ride;
};

exports.update = async (rideId, userId, data) => {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new AppError("Ride not found", 404, "NOT_FOUND");
  if (ride.createdBy.toString() !== userId) throw new AppError("Not authorized", 403, "FORBIDDEN");
  const allowed = ["title", "description", "startLocation", "destination", "rideDate", "maxParticipants"];
  allowed.forEach(k => { if (data[k] !== undefined) ride[k] = data[k]; });
  await ride.save();
  return ride;
};

exports.delete = async (rideId, userId) => {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new AppError("Ride not found", 404, "NOT_FOUND");
  if (ride.createdBy.toString() !== userId) throw new AppError("Not authorized", 403, "FORBIDDEN");
  await ride.deleteOne();
};

exports.join = async (rideId, userId) => {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new AppError("Ride not found", 404, "NOT_FOUND");
  if (ride.participants.some(p => p.toString() === userId)) throw new AppError("Already joined", 400, "ALREADY_JOINED");
  if (ride.maxParticipants && ride.participants.length >= ride.maxParticipants) throw new AppError("Ride is full", 400, "RIDE_FULL");
  ride.participants.push(userId);
  ride.participantsCount += 1;
  await ride.save();
  if (ride.createdBy.toString() !== userId) {
    await Notification.create({ recipient: ride.createdBy, sender: userId, type: "ride_join", ride: ride._id });
  }
};

exports.leave = async (rideId, userId) => {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new AppError("Ride not found", 404, "NOT_FOUND");
  if (ride.createdBy.toString() === userId) throw new AppError("Creator cannot leave the ride", 400, "CREATOR_CANNOT_LEAVE");
  ride.participants = ride.participants.filter(p => p.toString() !== userId);
  ride.participantsCount -= 1;
  await ride.save();
};

exports.start = async (rideId, userId) => {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new AppError("Ride not found", 404, "NOT_FOUND");
  if (ride.createdBy.toString() !== userId) throw new AppError("Only the creator can start the ride", 403, "FORBIDDEN");
  ride.status = "live";
  ride.startTime = new Date();
  ride.route = { type: "LineString", coordinates: [] };
  await ride.save();
  return ride;
};

exports.updateLocation = async (rideId, userId, { lat, lng }) => {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new AppError("Ride not found", 404, "NOT_FOUND");
  if (ride.status !== "live") throw new AppError("Ride not active", 400, "RIDE_NOT_ACTIVE");
  if (!ride.participants.some(p => p.toString() === userId)) throw new AppError("Not a participant", 403, "FORBIDDEN");

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
  return { totalDistance: ride.totalDistance };
};

exports.end = async (rideId, userId) => {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new AppError("Ride not found", 404, "NOT_FOUND");
  if (ride.createdBy.toString() !== userId) throw new AppError("Only the creator can end the ride", 403, "FORBIDDEN");
  ride.status = "completed";
  ride.endTime = new Date();
  const duration = ride.startTime ? (ride.endTime - ride.startTime) / 1000 : 0;
  ride.rideDuration = duration;
  if (duration > 0) {
    ride.averageSpeed = (ride.totalDistance / duration) * 3600;
  }
  await ride.save();
  return { distance: ride.totalDistance, duration, avgSpeed: ride.averageSpeed };
};

exports.getNearby = async ({ lat, lng, radius = 10 }) => {
  const radiusInMeters = radius * 1000;
  const rides = await Ride.find({
    startCoords: {
      $near: {
        $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: radiusInMeters
      }
    }
  }).populate("createdBy", "username profilePic").limit(20).lean();
  return rides;
};

exports.getRoute = async (rideId) => {
  const ride = await Ride.findById(rideId).select("route totalDistance rideDuration averageSpeed").lean();
  if (!ride) throw new AppError("Ride not found", 404, "NOT_FOUND");
  const route = ride.route?.coordinates.map(c => ({ latitude: c[1], longitude: c[0] })) || [];
  return { route, totalDistance: ride.totalDistance, duration: ride.rideDuration, avgSpeed: ride.averageSpeed };
};

exports.getLocations = async (rideId) => {
  const ride = await Ride.findById(rideId).populate("riderLocations.user", "username").lean();
  if (!ride) throw new AppError("Ride not found", 404, "NOT_FOUND");
  return ride.riderLocations;
};

exports.invite = async (rideId, targetUserId, requesterId) => {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new AppError("Ride not found", 404, "NOT_FOUND");
  if (ride.createdBy.toString() !== requesterId) throw new AppError("Not authorized", 403, "FORBIDDEN");
  await Notification.create({ recipient: targetUserId, sender: requesterId, type: "ride_invite", ride: ride._id });
};

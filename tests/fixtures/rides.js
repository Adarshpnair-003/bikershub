const Ride = require("../../models/Ride");

/**
 * Create a single test ride for the given creator.
 * All required Ride fields are pre-filled with sensible defaults.
 *
 * Required fields: title, startLocation, startCoords.coordinates,
 *                  destination, destinationCoords.coordinates, rideDate, createdBy
 */
exports.createRide = async (creatorId, overrides = {}) => {
  return Ride.create({
    title: "Test Ride",
    startLocation: "Mumbai",
    destination: "Pune",
    rideDate: new Date(Date.now() + 86400000), // tomorrow
    startCoords: {
      type: "Point",
      coordinates: [72.877, 19.076] // [lng, lat] Mumbai
    },
    destinationCoords: {
      type: "Point",
      coordinates: [73.856, 18.516] // [lng, lat] Pune
    },
    route: {
      type: "LineString",
      coordinates: []
    },
    maxParticipants: 10,
    createdBy: creatorId,
    participants: [creatorId],
    participantsCount: 1,
    ...overrides
  });
};

/**
 * Create multiple test rides for the given creator.
 */
exports.createRides = async (creatorId, count = 3) => {
  return Promise.all(
    Array.from({ length: count }, () => exports.createRide(creatorId))
  );
};

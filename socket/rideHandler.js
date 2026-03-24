const Ride = require("../models/Ride");
const haversineDistance = require("../utils/distance");
const logger = require("../config/logger");

// Module-scope maps for debouncing and distance tracking
const lastUpdateMap = new Map(); // userId -> last update timestamp (ms)
const lastCoordMap = new Map();  // `${rideId}:${userId}` -> [lng, lat]

module.exports = function registerRideHandlers(socket, io) {
  /* ============================
     RIDE TRACKING (LIVE GPS)
  ============================ */

  socket.on("joinRide", async ({ rideId }) => {
    try {
      const ride = await Ride.findById(rideId).select("participants").lean();
      if (!ride) return;
      if (!ride.participants.some(p => p.toString() === socket.user.id.toString())) return;
      socket.join(`ride:${rideId}`);
    } catch (err) {
      logger.error({ err: err.message }, "[socket] joinRide error");
    }
  });

  socket.on("leaveRide", ({ rideId }) => {
    socket.leave(`ride:${rideId}`);
  });

  socket.on("rideLocationUpdate", async (data) => {
    try {
      const { rideId, lat, lng } = data;
      const userId = socket.user.id;

      // Validation
      if (!rideId || lat == null || lng == null) return;

      // Debounce: skip updates arriving within 2 seconds of the previous one per rider
      const now = Date.now();
      const last = lastUpdateMap.get(userId) || 0;
      if (now - last < 2000) return;
      lastUpdateMap.set(userId, now);

      // Distance calculation using in-memory last coordinate
      const coordKey = `${rideId}:${userId}`;
      const prevCoord = lastCoordMap.get(coordKey);
      let distDelta = 0;
      if (prevCoord) {
        distDelta = haversineDistance(
          { lat: prevCoord[1], lng: prevCoord[0] },
          { lat, lng }
        );
        distDelta = Number(distDelta.toFixed(3));
      }
      lastCoordMap.set(coordKey, [lng, lat]);

      // Atomic update: try to update existing riderLocations entry first
      const updated = await Ride.findOneAndUpdate(
        { _id: rideId, "riderLocations.user": userId },
        {
          $set: {
            "riderLocations.$.location.coordinates": [lng, lat],
            "riderLocations.$.updatedAt": new Date()
          },
          $push: { "route.coordinates": [lng, lat] },
          $inc: { totalDistance: distDelta }
        }
      );

      if (!updated) {
        // Rider not in riderLocations yet — add them
        await Ride.findByIdAndUpdate(rideId, {
          $push: {
            "route.coordinates": [lng, lat],
            riderLocations: {
              user: userId,
              location: { type: "Point", coordinates: [lng, lat] },
              updatedAt: new Date()
            }
          },
          $inc: { totalDistance: distDelta }
        });
      }

      // Broadcast updated location to all ride participants
      io.to(`ride:${rideId}`).emit("riderLocationUpdated", { userId, lat, lng });
    } catch (err) {
      logger.error({ err: err.message }, "[socket] rideLocationUpdate error");
    }
  });
};

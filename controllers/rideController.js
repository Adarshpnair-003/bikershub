const Ride = require("../models/Ride");
const Notification = require("../models/Notification");
const Conversation = require("../models/Conversation");
const haversineDistance = require("../utils/distance");
const geocodeAddress = require("../utils/geocode");

/*
CREATE RIDE
*/
exports.createRide = async (req, res) => {
  try {
    const {
      title,
      description,
      startLocation,
      destination,
      rideDate,
      maxParticipants
    } = req.body;

    if (!title || !startLocation || !destination || !rideDate) {
      return res.status(400).json({
        msg: "All required fields missing"
      });
    }

    const startCoords = await geocodeAddress(startLocation);
    const destinationCoords = await geocodeAddress(destination);

    if (startCoords.coordinates[0] === 0 && startCoords.coordinates[1] === 0) {
      return res.status(400).json({ msg: "Invalid start location" });
    }

    if (destinationCoords.coordinates[0] === 0 && destinationCoords.coordinates[1] === 0) {
      return res.status(400).json({ msg: "Invalid destination" });
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

    res.status(201).json({ success: true, ride });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create ride" });
  }
};

/*
GET ALL RIDES ✅ (FIXED)
*/
exports.getRides = async (req, res) => {
  try {
    const rides = await Ride.find()
      .populate("createdBy", "username")
      .sort({ rideDate: 1 });

    res.json(rides);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/*
GET SINGLE RIDE
*/
exports.getRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
      .populate("createdBy", "username")
      .populate("participants", "username");

    if (!ride) return res.status(404).json({ msg: "Ride not found" });

    res.json(ride);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/*
UPDATE RIDE
*/
exports.updateRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride) return res.status(404).json({ msg: "Ride not found" });

    if (ride.createdBy.toString() !== req.user.id)
      return res.status(403).json({ msg: "Unauthorized" });

    Object.assign(ride, req.body);
    await ride.save();

    res.json(ride);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/*
JOIN RIDE
*/
exports.joinRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride) return res.status(404).json({ msg: "Ride not found" });

    if (ride.participants.includes(req.user.id))
      return res.status(400).json({ msg: "Already joined ride" });

    if (ride.participants.length >= ride.maxParticipants)
      return res.status(400).json({ msg: "Ride is full" });

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

    // 🏆 ACHIEVEMENT — first ride
    require("../services/achievementService")
      .checkRideMilestones(req.user.id, ride)
      .catch(() => {});

    res.json({ msg: "Joined ride successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/*
LEAVE RIDE
*/
exports.leaveRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride) return res.status(404).json({ msg: "Ride not found" });

    if (ride.createdBy.toString() === req.user.id)
      return res.status(400).json({ msg: "Creator cannot leave ride" });

    ride.participants = ride.participants.filter(
      id => id.toString() !== req.user.id
    );

    ride.participantsCount -= 1;

    await ride.save();

    res.json({ msg: "Left ride successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/*
GET LIVE LOCATIONS
*/
exports.getRideLocations = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
      .populate("riderLocations.user", "username");

    if (!ride) return res.status(404).json({ msg: "Ride not found" });

    res.json(ride.riderLocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/*
START RIDE
*/
exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride) return res.status(404).json({ msg: "Ride not found" });

    if (ride.createdBy.toString() !== req.user.id)
      return res.status(403).json({ msg: "Unauthorized" });

    ride.status = "live";
    ride.startTime = new Date();
    ride.route = { type: "LineString", coordinates: [] };

    await ride.save();

    res.json({ msg: "Ride started" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/*
UPDATE LOCATION
*/
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    const ride = await Ride.findById(req.params.rideId);

    if (!ride || ride.status !== "live")
      return res.status(400).json({ msg: "Ride not active" });

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

    res.json({ totalDistance: ride.totalDistance });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/*
END RIDE
*/
exports.endRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride) return res.status(404).json({ msg: "Ride not found" });

    ride.status = "completed";
    ride.endTime = new Date();

    const duration = (ride.endTime - ride.startTime) / 1000;

    ride.rideDuration = duration;

    if (duration > 0) {
      ride.averageSpeed = (ride.totalDistance / duration) * 3600;
    }

    await ride.save();

    // 🏆 ACHIEVEMENT — distance milestones for every participant
    const achSvc = require("../services/achievementService");
    Promise.all(
      (ride.participants || []).map((p) =>
        achSvc.checkRideMilestones(p, ride).catch(() => {})
      )
    ).catch(() => {});

    res.json({
      distance: ride.totalDistance,
      duration,
      avgSpeed: ride.averageSpeed
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/*
NEARBY RIDES ✅ FIXED
*/
exports.getNearbyRides = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    if (!lat || !lng)
      return res.status(400).json({ msg: "Lat & Lng required" });

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

    res.json({ count: rides.length, rides });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/*
GET ROUTE (FOR GOOGLE MAPS)
*/
exports.getRideRoute = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride)
      return res.status(404).json({ msg: "Ride not found" });

    const route = ride.route?.coordinates.map(c => ({
      latitude: c[1],
      longitude: c[0]
    })) || [];

    res.json({
      route,
      totalDistance: ride.totalDistance,
      duration: ride.rideDuration,
      avgSpeed: ride.averageSpeed
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
/*
INVITE USER TO RIDE
*/
exports.inviteToRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride)
      return res.status(404).json({ msg: "Ride not found" });

    if (ride.createdBy.toString() !== req.user.id)
      return res.status(403).json({ msg: "Unauthorized" });

    await Notification.create({
      recipient: req.params.userId,
      sender: req.user.id,
      type: "ride_invite",
      ride: ride._id
    });

    res.json({ msg: "Ride invitation sent" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/*
DELETE RIDE
*/
exports.deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);

    if (!ride)
      return res.status(404).json({ msg: "Ride not found" });

    if (ride.createdBy.toString() !== req.user.id)
      return res.status(403).json({ msg: "Unauthorized" });

    await ride.deleteOne();

    res.json({ msg: "Ride deleted successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
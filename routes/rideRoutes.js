const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const rideController = require("../controllers/rideController");
const validate = require("../middleware/validate");
const { createRideSchema, updateRideSchema, locationSchema } = require("../validators/rideValidator");

/* SPECIAL ROUTES FIRST */
router.get("/nearby", protect, rideController.getNearbyRides);

/* LIST */
router.get("/", rideController.getRides);

/* CREATE */
router.post("/", protect, validate(createRideSchema), rideController.createRide);

/* JOIN / LEAVE / INVITE */
router.post("/:rideId/join", protect, rideController.joinRide);
router.post("/:rideId/leave", protect, rideController.leaveRide);
router.post("/:rideId/invite/:userId", protect, rideController.inviteToRide);

/* TRACKING */
router.put("/:rideId/start", protect, rideController.startRide);
router.put("/:rideId/location", protect, validate(locationSchema), rideController.updateLocation);
router.put("/:rideId/end", protect, rideController.endRide);

/* ROUTE + LIVE LOCATIONS */
router.get("/:rideId/route", protect, rideController.getRideRoute);
router.get("/:rideId/locations", protect, rideController.getRideLocations);

/* GENERAL LAST */
router.get("/:rideId", rideController.getRide);
router.put("/:rideId", protect, validate(updateRideSchema), rideController.updateRide);
router.delete("/:rideId", protect, rideController.deleteRide);

module.exports = router;

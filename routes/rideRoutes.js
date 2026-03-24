const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const rideController = require("../controllers/rideController");

/* SPECIAL ROUTES FIRST */
router.get("/nearby", protect, rideController.getNearbyRides);

/* CREATE */
router.post("/", protect, rideController.createRide);

/* ROUTE + LIVE */
router.get("/:rideId/route", protect, rideController.getRideRoute);
router.get("/:rideId/locations", protect, rideController.getRideLocations);

/* TRACKING */
router.put("/:rideId/start", protect, rideController.startRide);
router.put("/:rideId/location", protect, rideController.updateLocation);
router.put("/:rideId/end", protect, rideController.endRide);

/* JOIN — support both /:rideId/join and /join/:rideId patterns */
router.post("/:rideId/join", protect, rideController.joinRide);
router.post("/:rideId/leave", protect, rideController.leaveRide);
router.post("/join/:rideId", protect, rideController.joinRide);
router.post("/leave/:rideId", protect, rideController.leaveRide);
router.post("/invite/:rideId/:userId", protect, rideController.inviteToRide);

/* GENERAL LAST */
router.get("/", rideController.getRides);
router.get("/:rideId", rideController.getRide);
router.put("/:rideId", protect, rideController.updateRide);
router.delete("/:rideId", protect, rideController.deleteRide);

module.exports = router;
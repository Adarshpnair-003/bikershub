const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");

const protect = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const rideController = require("../controllers/rideController");

/* SPECIAL ROUTES FIRST */
router.get(
	"/nearby",
	protect,
	[
		query("lat").isFloat({ min: -90, max: 90 }).withMessage("Valid latitude is required"),
		query("lng").isFloat({ min: -180, max: 180 }).withMessage("Valid longitude is required"),
		query("radius")
			.optional()
			.isFloat({ gt: 0 })
			.withMessage("Radius must be a positive number")
	],
	validateRequest,
	rideController.getNearbyRides
);

/* CREATE */
router.post(
	"/",
	protect,
	[
		body("title").trim().notEmpty().withMessage("Title is required"),
		body("startLocation").trim().notEmpty().withMessage("Start location is required"),
		body("destination").trim().notEmpty().withMessage("Destination is required"),
		body("rideDate").isISO8601().withMessage("Valid ride date is required"),
		body("maxParticipants")
			.optional()
			.isInt({ min: 1 })
			.withMessage("Max participants must be at least 1")
	],
	validateRequest,
	rideController.createRide
);

/* ROUTE + LIVE */
router.get(
	"/:rideId/route",
	protect,
	[param("rideId").isMongoId().withMessage("Valid ride id is required")],
	validateRequest,
	rideController.getRideRoute
);
router.get(
	"/:rideId/locations",
	protect,
	[param("rideId").isMongoId().withMessage("Valid ride id is required")],
	validateRequest,
	rideController.getRideLocations
);

/* TRACKING */
router.put(
	"/:rideId/start",
	protect,
	[param("rideId").isMongoId().withMessage("Valid ride id is required")],
	validateRequest,
	rideController.startRide
);
router.put(
	"/:rideId/location",
	protect,
	[
		param("rideId").isMongoId().withMessage("Valid ride id is required"),
		body("lat").isFloat({ min: -90, max: 90 }).withMessage("Valid latitude is required"),
		body("lng").isFloat({ min: -180, max: 180 }).withMessage("Valid longitude is required")
	],
	validateRequest,
	rideController.updateLocation
);
router.put(
	"/:rideId/end",
	protect,
	[param("rideId").isMongoId().withMessage("Valid ride id is required")],
	validateRequest,
	rideController.endRide
);

/* JOIN — support both /:rideId/join and /join/:rideId patterns */
router.post(
	"/:rideId/join",
	protect,
	[param("rideId").isMongoId().withMessage("Valid ride id is required")],
	validateRequest,
	rideController.joinRide
);
router.post(
	"/:rideId/leave",
	protect,
	[param("rideId").isMongoId().withMessage("Valid ride id is required")],
	validateRequest,
	rideController.leaveRide
);
router.post(
	"/join/:rideId",
	protect,
	[param("rideId").isMongoId().withMessage("Valid ride id is required")],
	validateRequest,
	rideController.joinRide
);
router.post(
	"/leave/:rideId",
	protect,
	[param("rideId").isMongoId().withMessage("Valid ride id is required")],
	validateRequest,
	rideController.leaveRide
);
router.post(
	"/invite/:rideId/:userId",
	protect,
	[
		param("rideId").isMongoId().withMessage("Valid ride id is required"),
		param("userId").isMongoId().withMessage("Valid user id is required")
	],
	validateRequest,
	rideController.inviteToRide
);

/* GENERAL LAST */
router.get("/", rideController.getRides);
router.get(
	"/:rideId",
	[param("rideId").isMongoId().withMessage("Valid ride id is required")],
	validateRequest,
	rideController.getRide
);
router.put(
	"/:rideId",
	protect,
	[param("rideId").isMongoId().withMessage("Valid ride id is required")],
	validateRequest,
	rideController.updateRide
);
router.delete(
	"/:rideId",
	protect,
	[param("rideId").isMongoId().withMessage("Valid ride id is required")],
	validateRequest,
	rideController.deleteRide
);

module.exports = router;
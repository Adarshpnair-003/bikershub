const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const routeController = require("../controllers/routeController");

// Public geocoding
router.get("/geocode", routeController.geocode);
router.get("/reverse", routeController.reverseGeocode);

// Auth-required route planning
router.post("/directions", protect, routeController.getDirections);
router.post("/isochrone", protect, routeController.getIsochrone);
router.post("/snap", protect, routeController.snapToRoads);
router.post("/summary", protect, routeController.getRouteSummary);

module.exports = router;

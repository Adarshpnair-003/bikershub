const express = require("express");
const router = express.Router();
const { getWeather, getRideWeather } = require("../controllers/weatherController");

// GET /api/weather?lat=<lat>&lng=<lng>
router.get("/", getWeather);

// GET /api/weather/ride/:rideId
router.get("/ride/:rideId", getRideWeather);

module.exports = router;

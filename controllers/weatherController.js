const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");
const AppError = require("../utils/AppError");
const weatherService = require("../services/weatherService");

const getWeather = catchAsync(async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    throw new AppError("lat and lng query parameters are required", 400, "MISSING_COORDS");
  }
  const data = await weatherService.getWeather(lat, lng);
  res.status(200).json(apiResponse.success(data, "Weather fetched"));
});

const getRideWeather = catchAsync(async (req, res) => {
  const { rideId } = req.params;
  const data = await weatherService.getWeatherForRide(rideId);
  res.status(200).json(apiResponse.success(data, "Weather fetched"));
});

module.exports = { getWeather, getRideWeather };

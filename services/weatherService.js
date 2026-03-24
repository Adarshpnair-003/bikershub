const env = require("../config/env");
const AppError = require("../utils/AppError");
const Ride = require("../models/Ride");

/**
 * Fetch current weather from OpenWeatherMap for the given coordinates.
 * @param {number|string} lat
 * @param {number|string} lng
 * @returns {Promise<object>}
 */
const getWeather = async (lat, lng) => {
  const apiKey = env.WEATHER_API_KEY;
  if (!apiKey) {
    throw new AppError("Weather API key not configured", 503, "NOT_CONFIGURED");
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`;

  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new AppError("Weather service unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  if (!response.ok) {
    throw new AppError("Weather service unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new AppError("Weather service unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  // Guard against unexpected OWM response shapes
  if (!data?.main || !data?.wind || !data?.weather?.[0]) {
    throw new AppError("Weather service unavailable", 503, "SERVICE_UNAVAILABLE");
  }

  return {
    temp: data.main.temp,
    feelsLike: data.main.feels_like,
    humidity: data.main.humidity,
    wind: {
      speed: data.wind.speed,
      direction: data.wind.deg ?? null,
    },
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    city: data.name ?? null,
  };
};

/**
 * Fetch weather for a ride's start location.
 * @param {string} rideId
 * @returns {Promise<object>}
 */
const getWeatherForRide = async (rideId) => {
  const ride = await Ride.findById(rideId).lean();
  if (!ride) {
    throw new AppError("Ride not found", 404, "NOT_FOUND");
  }

  // startCoords.coordinates is [lng, lat] per GeoJSON convention
  const [lng, lat] = ride.startCoords.coordinates;
  const weather = await getWeather(lat, lng);

  return {
    ...weather,
    rideId,
    location: ride.startLocation,
  };
};

module.exports = { getWeather, getWeatherForRide };

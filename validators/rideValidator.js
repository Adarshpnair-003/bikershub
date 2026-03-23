const Joi = require("joi");

exports.createRideSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(1000).optional(),
  startLocation: Joi.string().required(),
  destination: Joi.string().required(),
  rideDate: Joi.date().required(),
  maxParticipants: Joi.number().integer().min(2).optional()
});

exports.updateRideSchema = Joi.object({
  title: Joi.string().min(3).max(200).optional(),
  description: Joi.string().max(1000).optional(),
  startLocation: Joi.string().optional(),
  destination: Joi.string().optional(),
  rideDate: Joi.date().optional(),
  maxParticipants: Joi.number().integer().min(2).optional()
});

exports.locationSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required()
});

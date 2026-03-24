const Joi = require("joi");

exports.createClubSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  location: Joi.object({
    type: Joi.string().valid("Point").default("Point"),
    coordinates: Joi.array().items(Joi.number()).length(2).optional()
  }).optional(),
  locationName: Joi.string().max(200).optional(),
  isPrivate: Joi.boolean().default(false)
});

exports.nearbySchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().min(1).max(100).default(25)
});

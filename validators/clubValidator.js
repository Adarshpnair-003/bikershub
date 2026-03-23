const Joi = require("joi");

exports.createClubSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  location: Joi.string().optional(),
  isPrivate: Joi.boolean().default(false)
});

const Joi = require("joi");

const TYPES = ["sport", "cruiser", "adventure", "naked", "tourer", "off-road", "scooter", "other"];
const currentYear = new Date().getFullYear();

exports.createBikeSchema = Joi.object({
  brand: Joi.string().trim().min(1).max(50).required(),
  model: Joi.string().trim().min(1).max(50).required(),
  year: Joi.number().integer().min(1900).max(currentYear + 1).required(),
  type: Joi.string().lowercase().valid(...TYPES).required(),
  engineCC: Joi.number().integer().min(50).max(3000).required(),
  color: Joi.string().trim().min(1).max(30).required(),
  nickname: Joi.string().trim().max(40).allow("").optional()
});

exports.updateBikeSchema = Joi.object({
  brand: Joi.string().trim().min(1).max(50).optional(),
  model: Joi.string().trim().min(1).max(50).optional(),
  year: Joi.number().integer().min(1900).max(currentYear + 1).optional(),
  type: Joi.string().lowercase().valid(...TYPES).optional(),
  engineCC: Joi.number().integer().min(50).max(3000).optional(),
  color: Joi.string().trim().min(1).max(30).optional(),
  nickname: Joi.string().trim().max(40).allow("").optional()
}).min(1);

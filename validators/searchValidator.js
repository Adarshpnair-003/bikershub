const Joi = require("joi");

exports.searchSchema = Joi.object({
  q: Joi.string().min(1).max(200).required(),
  type: Joi.string().valid("users", "clubs", "rides", "posts").optional(),
  status: Joi.string().valid("upcoming", "live", "completed", "cancelled").optional(),
  dateFrom: Joi.string().isoDate().optional(),
  dateTo: Joi.string().isoDate().optional()
});

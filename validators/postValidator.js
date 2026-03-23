const Joi = require("joi");

exports.createPostSchema = Joi.object({
  content: Joi.string().max(2000).optional(),
  club: Joi.string().optional()
}).or("content"); // at least content or files (files checked in controller)

exports.updatePostSchema = Joi.object({
  content: Joi.string().max(2000).optional()
});

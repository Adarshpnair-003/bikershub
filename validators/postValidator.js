const Joi = require("joi");

exports.createPostSchema = Joi.object({
  content: Joi.string().max(2000).optional(),
  club: Joi.string().optional()
}); // content is optional here — posts can be media-only (files validated in controller)

exports.updatePostSchema = Joi.object({
  content: Joi.string().max(2000).optional()
});

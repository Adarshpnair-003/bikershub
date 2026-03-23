const Joi = require("joi");

exports.sendMessageSchema = Joi.object({
  conversationId: Joi.string().required(),
  text: Joi.string().min(1).max(5000).required(),
  type: Joi.string().valid("text", "image", "location").default("text")
});

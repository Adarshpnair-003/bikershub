const Joi = require("joi");

exports.registerSchema = Joi.object({
  username: Joi.string().min(3).optional(),
  name: Joi.string().min(3).optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
}).or("username", "name");

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

exports.refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

exports.logoutSchema = Joi.object({
  refreshToken: Joi.string().required()
});

/**
 * validate — generic Joi schema validator.
 * Usage: router.post("/", validate(schema), controller)
 */

const AppError = require("../utils/AppError");

module.exports = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const message = error.details.map((d) => d.message).join("; ");
    return next(new AppError(message, 400, "VALIDATION_ERROR"));
  }

  req.body = value;
  next();
};

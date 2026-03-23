const AppError = require("../utils/AppError");

/**
 * Returns a middleware that validates req[source] against a Joi schema.
 * Usage: validate(schema)  — validates req.body by default
 *        validate(schema, "params")  — validates req.params
 *        validate(schema, "query")   — validates req.query
 */
module.exports = function validate(schema, source = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const message = error.details.map((d) => d.message).join("; ");
      return next(new AppError(message, 400, "VALIDATION_ERROR"));
    }

    req[source] = value; // replace with sanitized/coerced values
    next();
  };
};

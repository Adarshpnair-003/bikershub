const AppError = require("../utils/AppError");
const logger = require("../config/logger");

function handleCastError(err) {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400, "INVALID_ID");
}

function handleDuplicateKeyError(err) {
  const field = Object.keys(err.keyValue || {})[0] || "field";
  return new AppError(`Duplicate value for ${field}. Please use another value.`, 400, "DUPLICATE_KEY");
}

function handleValidationError(err) {
  const errors = Object.values(err.errors).map((e) => e.message);
  return new AppError(`Validation failed: ${errors.join(". ")}`, 400, "VALIDATION_ERROR");
}

function handleJWTError() {
  return new AppError("Invalid token. Please log in again.", 401, "INVALID_TOKEN");
}

function handleJWTExpiredError() {
  return new AppError("Token expired. Please log in again.", 401, "TOKEN_EXPIRED");
}

function handleMulterError(err) {
  return new AppError(err.message, 400, "UPLOAD_ERROR");
}

module.exports = function errorHandler(err, req, res, next) {
  let error = err;

  // Mongoose errors
  if (err.name === "CastError") error = handleCastError(err);
  else if (err.code === 11000) error = handleDuplicateKeyError(err);
  else if (err.name === "ValidationError") error = handleValidationError(err);
  // JWT errors
  else if (err.name === "JsonWebTokenError") error = handleJWTError();
  else if (err.name === "TokenExpiredError") error = handleJWTExpiredError();
  // Multer errors
  else if (err.name === "MulterError") error = handleMulterError(err);

  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message }
    });
  }

  // Unknown/programmer errors: don't leak internals
  logger.error({ err }, "[errorHandler] Unexpected error");
  return res.status(500).json({
    success: false,
    error: { code: "SERVER_ERROR", message: "Something went wrong. Please try again." }
  });
};

/**
 * AppError — operational error class for predictable, user-facing failures.
 * Distinguished from programming errors by `isOperational = true`.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = "ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

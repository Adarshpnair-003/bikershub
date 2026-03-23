class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || "ERROR";
    this.isOperational = true;  // distinguishes known errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

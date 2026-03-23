const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const env = require("../config/env");

/**
 * Protect routes — verifies JWT access token.
 * Attaches req.user = { id } on success.
 */
exports.protect = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Authentication required. Please log in.", 401, "NO_TOKEN"));
  }

  const token = authHeader.split(" ")[1];

  // jwt.verify throws JsonWebTokenError / TokenExpiredError — caught by errorHandler
  const decoded = jwt.verify(token, env.JWT_SECRET);

  req.user = { id: decoded.id };
  next();
});

/**
 * Optional auth — attaches req.user if a valid token is present, but does not
 * reject the request if no token is provided. Useful for public endpoints that
 * show richer data to authenticated users.
 */
exports.optionalAuth = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(); // No token — continue unauthenticated
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: decoded.id };
  } catch {
    // Invalid token on optional route — ignore it, continue unauthenticated
  }

  next();
});

const rateLimit = require("express-rate-limit");

// Global: 100 requests per 15 minutes
exports.globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests, please try again later." } }
});

// Auth: 5 requests per 15 minutes (login/register attempts)
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "AUTH_RATE_LIMITED", message: "Too many auth attempts, please try again in 15 minutes." } }
});

// Upload: 20 requests per hour
exports.uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "UPLOAD_RATE_LIMITED", message: "Upload limit reached, please try again in an hour." } }
});

// Search: 30 requests per minute
exports.searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "SEARCH_RATE_LIMITED", message: "Search limit reached, please slow down." } }
});

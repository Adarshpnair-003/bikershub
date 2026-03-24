const rateLimit = require("express-rate-limit");
const env = require("../config/env");

// Global: 100 requests per 15 minutes
exports.globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,          // v7+ uses `limit` (not `max`)
  standardHeaders: "draft-7",         // RateLimit-* headers per IETF draft-7
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests, please try again later." } }
});

// Auth: 5 requests per 15 minutes (login/register attempts)
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: { code: "AUTH_RATE_LIMITED", message: "Too many auth attempts, please try again in 15 minutes." } }
});

// Upload: 20 requests per hour
exports.uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: { code: "UPLOAD_RATE_LIMITED", message: "Upload limit reached, please try again in an hour." } }
});

// Search: 30 requests per minute
exports.searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: { code: "SEARCH_RATE_LIMITED", message: "Search limit reached, please slow down." } }
});

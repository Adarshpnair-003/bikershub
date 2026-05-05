/**
 * rateLimiter.js — per-feature rate limiters.
 * Uses in-memory store; for multi-instance deployments swap in a Redis store later.
 */

const rateLimit = require("express-rate-limit");

const standardOpts = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    res.status(options.statusCode || 429).json({
      success: false,
      error: { code: "RATE_LIMIT", message: options.message || "Too many requests" }
    });
  }
};

exports.uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: "Upload rate limit exceeded. Try again later.",
  ...standardOpts
});

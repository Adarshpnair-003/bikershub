/**
 * catchAsync — wraps an async route handler so thrown errors flow into Express's
 * error middleware via next(err) instead of crashing the process.
 */
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

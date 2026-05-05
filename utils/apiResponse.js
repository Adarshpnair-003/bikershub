/**
 * apiResponse — standardized response envelope helpers.
 * Success: { success: true, data, message? }
 * Error:   { success: false, error: { code, message } }
 */

exports.success = (data = null, message) => {
  const body = { success: true, data };
  if (message) body.message = message;
  return body;
};

exports.error = (code, message) => ({
  success: false,
  error: { code, message }
});

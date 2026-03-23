const apiResponse = {
  success(data, message = "Success") {
    return { success: true, data, message };
  },
  error(message, code = "ERROR") {
    return { success: false, error: { code, message } };
  },
  paginated(data, pagination, message = "Success") {
    return { success: true, data, pagination, message };
  }
};

module.exports = apiResponse;

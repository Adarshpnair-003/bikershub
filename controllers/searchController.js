const searchService = require("../services/searchService");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");

exports.globalSearch = catchAsync(async (req, res) => {
  const results = await searchService.globalSearch(req.query.q);
  res.json(apiResponse.success(results, "Search results"));
});

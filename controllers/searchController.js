const searchService = require("../services/searchService");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");

exports.globalSearch = catchAsync(async (req, res) => {
  const { q, type, status, dateFrom, dateTo } = req.query;
  const results = await searchService.globalSearch({ query: q, type, status, dateFrom, dateTo });
  res.json(apiResponse.success(results, "Search results"));
});

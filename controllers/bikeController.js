const bikeService = require("../services/bikeService");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");

exports.create = catchAsync(async (req, res) => {
  const bike = await bikeService.createBike(req.user.id, req.body, req.file);
  res.status(201).json(apiResponse.success(bike, "Bike added"));
});

exports.listByUser = catchAsync(async (req, res) => {
  const bikes = await bikeService.listByUser(req.params.userId);
  res.json(apiResponse.success(bikes));
});

exports.getById = catchAsync(async (req, res) => {
  const bike = await bikeService.getById(req.params.id);
  res.json(apiResponse.success(bike));
});

exports.update = catchAsync(async (req, res) => {
  const bike = await bikeService.updateBike(req.user.id, req.params.id, req.body, req.file);
  res.json(apiResponse.success(bike, "Bike updated"));
});

exports.setPrimary = catchAsync(async (req, res) => {
  const bike = await bikeService.setPrimary(req.user.id, req.params.id);
  res.json(apiResponse.success(bike, "Set as current ride"));
});

exports.remove = catchAsync(async (req, res) => {
  await bikeService.deleteBike(req.user.id, req.params.id);
  res.json(apiResponse.success(null, "Bike deleted"));
});

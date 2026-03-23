const userService = require("../services/userService");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");

exports.getCurrentUser = catchAsync(async (req, res) => {
  const user = await userService.getMe(req.user.id);
  res.json(apiResponse.success(user));
});

exports.getUserProfile = catchAsync(async (req, res) => {
  const result = await userService.getProfile(req.params.id, req.user?.id);
  res.json(apiResponse.success(result));
});

exports.updateProfile = catchAsync(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  res.json(apiResponse.success(user, "Profile updated"));
});

exports.followUser = catchAsync(async (req, res) => {
  await userService.follow(req.user.id, req.params.id);
  res.json(apiResponse.success(null, "User followed successfully"));
});

exports.unfollowUser = catchAsync(async (req, res) => {
  await userService.unfollow(req.user.id, req.params.id);
  res.json(apiResponse.success(null, "User unfollowed successfully"));
});

const authService = require("../services/authService");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");

exports.register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(apiResponse.success(result, "User registered successfully"));
});

exports.login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  res.json(apiResponse.success(result, "Login successful"));
});

exports.googleAuth = catchAsync(async (req, res) => {
  const result = await authService.googleAuth(req.body.token);
  res.json(apiResponse.success(result, "Google login successful"));
});

exports.refreshToken = catchAsync(async (req, res) => {
  const result = await authService.refreshToken(req.body.refreshToken);
  res.json(apiResponse.success(result, "Token refreshed"));
});

exports.logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken, req.user.id);
  res.json(apiResponse.success(null, "Logged out successfully"));
});

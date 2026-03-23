const uploadService = require("../services/uploadService");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");

exports.uploadFile = catchAsync(async (req, res) => {
  const result = await uploadService.uploadSingle(req.file);
  res.status(201).json(apiResponse.success(result, "File uploaded"));
});

exports.uploadMultipleFiles = catchAsync(async (req, res) => {
  const results = await uploadService.uploadMultiple(req.files);
  res.status(201).json(apiResponse.success(results, "Files uploaded"));
});

exports.uploadProfilePic = catchAsync(async (req, res) => {
  const profilePic = await uploadService.uploadProfilePic(req.file, req.user.id);
  res.json(apiResponse.success(profilePic, "Profile picture updated"));
});

exports.deleteFile = catchAsync(async (req, res) => {
  await uploadService.deleteFile(req.body.public_id, req.user.id);
  res.json(apiResponse.success(null, "File deleted"));
});

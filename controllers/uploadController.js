const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const Post = require("../models/Post");
const User = require("../models/User");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const apiResponse = require("../utils/apiResponse");

exports.uploadFile = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("No file uploaded", 400, "NO_FILE"));
  }

  let result;
  try {
    result = await cloudinary.uploader.upload(req.file.path, {
      folder: "bikerhub",
      resource_type: "auto"
    });
  } finally {
    await fs.promises.unlink(req.file.path).catch(() => {});
  }

  res.json(apiResponse.success({ url: result.secure_url, public_id: result.public_id }));
});


exports.uploadMultipleFiles = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError("No files uploaded", 400, "NO_FILE"));
  }

  let results;
  try {
    results = await Promise.all(
      req.files.map(file =>
        cloudinary.uploader.upload(file.path, {
          folder: "bikerhub/posts",
          resource_type: "auto"
        })
      )
    );
  } finally {
    await Promise.all(
      req.files.map(file => fs.promises.unlink(file.path).catch(() => {}))
    );
  }

  const media = results.map(item => ({
    url: item.secure_url,
    public_id: item.public_id,
    type: item.resource_type
  }));

  res.json(apiResponse.success({ media }));
});


exports.uploadProfilePic = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("No file uploaded", 400, "NO_FILE"));
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    return next(new AppError("User not found", 404, "NOT_FOUND"));
  }

  let result;
  try {
    // delete old profile pic from Cloudinary if exists
    if (user.profilePic?.public_id) {
      await cloudinary.uploader.destroy(user.profilePic.public_id);
    }

    result = await cloudinary.uploader.upload(req.file.path, {
      folder: "bikerhub/profile"
    });
  } finally {
    await fs.promises.unlink(req.file.path).catch(() => {});
  }

  user.profilePic = {
    url: result.secure_url,
    public_id: result.public_id
  };

  await user.save();

  res.json(apiResponse.success({ profilePic: user.profilePic }));
});


exports.deleteFile = catchAsync(async (req, res, next) => {
  const { public_id, type } = req.body;

  if (!public_id) {
    return next(new AppError("public_id is required", 400, "VALIDATION_ERROR"));
  }

  // Verify ownership: check if a Post with this public_id belongs to the caller,
  // or the caller's own profilePic matches this public_id
  const post = await Post.findOne({ "media.public_id": public_id });

  if (post) {
    if (post.author.toString() !== req.user.id) {
      return next(new AppError("Not authorized", 403, "FORBIDDEN"));
    }
  } else {
    // Check if it belongs to the user's profile picture
    const user = await User.findById(req.user.id);
    if (!user || user.profilePic?.public_id !== public_id) {
      return next(new AppError("Not authorized", 403, "FORBIDDEN"));
    }
  }

  await cloudinary.uploader.destroy(public_id, {
    resource_type: type || "image"
  });

  res.json(apiResponse.success(null, "Deleted successfully"));
});

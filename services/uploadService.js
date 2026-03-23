const cloudinary = require("../config/cloudinary");
const User = require("../models/User");
const Post = require("../models/Post");
const AppError = require("../utils/AppError");
const fs = require("fs");

async function cleanupFile(path) {
  if (path) await fs.promises.unlink(path).catch(() => {});
}

exports.uploadSingle = async (file) => {
  if (!file) throw new AppError("No file provided", 400, "NO_FILE");
  try {
    const result = await cloudinary.uploader.upload(file.path, { folder: "bikerhub", resource_type: "auto" });
    return { url: result.secure_url, public_id: result.public_id, type: result.resource_type };
  } finally {
    await cleanupFile(file.path);
  }
};

exports.uploadMultiple = async (files) => {
  if (!files || files.length === 0) throw new AppError("No files provided", 400, "NO_FILE");
  try {
    const results = await Promise.all(
      files.map(f => cloudinary.uploader.upload(f.path, { folder: "bikerhub", resource_type: "auto" }))
    );
    return results.map(r => ({ url: r.secure_url, public_id: r.public_id, type: r.resource_type }));
  } finally {
    await Promise.all(files.map(f => cleanupFile(f.path)));
  }
};

exports.uploadProfilePic = async (file, userId) => {
  if (!file) throw new AppError("No file provided", 400, "NO_FILE");
  try {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
    // Delete old profile pic if exists
    if (user.profilePic?.public_id) {
      await cloudinary.uploader.destroy(user.profilePic.public_id).catch(() => {});
    }
    const result = await cloudinary.uploader.upload(file.path, { folder: "bikerhub/profiles", resource_type: "image" });
    user.profilePic = { url: result.secure_url, public_id: result.public_id };
    await user.save();
    return user.profilePic;
  } finally {
    await cleanupFile(file.path);
  }
};

exports.deleteFile = async (publicId, userId) => {
  if (!publicId) throw new AppError("public_id is required", 400, "MISSING_PUBLIC_ID");
  // Ownership check: find a post with this public_id authored by user, or user's profile pic
  const post = await Post.findOne({ "media.public_id": publicId, author: userId });
  if (!post) {
    const user = await User.findById(userId);
    if (!user || user.profilePic?.public_id !== publicId)
      throw new AppError("Not authorized to delete this file", 403, "FORBIDDEN");
  }
  // Determine resource type from the post or default to image
  const mediaItem = post?.media?.find(m => m.public_id === publicId);
  await cloudinary.uploader.destroy(publicId, { resource_type: mediaItem?.type || "image" });
};

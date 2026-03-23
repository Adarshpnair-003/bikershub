const User = require("../models/User");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const AppError = require("../utils/AppError");

exports.getMe = async (userId) => {
  const user = await User.findById(userId)
    .select("-password")
    .populate("followers following", "username profilePic")
    .lean();
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  return user;
};

exports.getProfile = async (profileId, viewerId) => {
  const user = await User.findById(profileId)
    .select("-password")
    .populate("followers following", "username profilePic")
    .lean();
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  const posts = await Post.find({ author: profileId }).sort({ createdAt: -1 }).lean();
  let isFollowing = false;
  if (viewerId) {
    const viewer = await User.findById(viewerId).select("following").lean();
    isFollowing = viewer?.following.some(id => id.toString() === profileId) ?? false;
  }
  return { user, posts, followersCount: user.followers.length, followingCount: user.following.length, isFollowing };
};

exports.updateProfile = async (userId, updates) => {
  const allowed = ["username", "bio", "phone"];
  const filtered = {};
  allowed.forEach(k => { if (updates[k] !== undefined) filtered[k] = updates[k]; });
  const user = await User.findByIdAndUpdate(userId, filtered, { new: true, runValidators: true })
    .select("-password").lean();
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  return user;
};

exports.follow = async (currentUserId, targetId) => {
  if (currentUserId === targetId) throw new AppError("Cannot follow yourself", 400, "SELF_FOLLOW");
  const [current, target] = await Promise.all([User.findById(currentUserId), User.findById(targetId)]);
  if (!target) throw new AppError("User not found", 404, "NOT_FOUND");
  if (current.following.some(id => id.toString() === targetId))
    throw new AppError("Already following", 400, "ALREADY_FOLLOWING");
  current.following.push(targetId);
  target.followers.push(currentUserId);
  await Promise.all([current.save(), target.save()]);
  await Notification.create({ recipient: target._id, sender: currentUserId, type: "follow" });
};

exports.unfollow = async (currentUserId, targetId) => {
  const [current, target] = await Promise.all([User.findById(currentUserId), User.findById(targetId)]);
  if (!target) throw new AppError("User not found", 404, "NOT_FOUND");
  current.following = current.following.filter(id => id.toString() !== targetId);
  target.followers = target.followers.filter(id => id.toString() !== currentUserId);
  await Promise.all([current.save(), target.save()]);
};

const { escapeRegex } = require("../utils/sanitize");
const User = require("../models/User");
const Club = require("../models/Club");
const Ride = require("../models/Ride");
const Post = require("../models/Post");
const AppError = require("../utils/AppError");

exports.globalSearch = async (query) => {
  if (!query || !query.trim()) throw new AppError("Search query required", 400, "MISSING_QUERY");
  const regex = new RegExp(escapeRegex(query.trim()), "i");
  const [users, clubs, rides, posts] = await Promise.all([
    User.find({ username: { $regex: regex } }).select("username profilePic").limit(10).lean(),
    Club.find({ name: { $regex: regex } }).select("name description").limit(10).lean(),
    Ride.find({ title: { $regex: regex } }).populate("createdBy", "username").limit(10).lean(),
    Post.find({ content: { $regex: regex } }).populate("author", "username").limit(10).lean()
  ]);
  return { users, clubs, rides, posts };
};

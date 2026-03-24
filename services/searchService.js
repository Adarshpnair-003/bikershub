const { escapeRegex } = require("../utils/sanitize");
const User = require("../models/User");
const Club = require("../models/Club");
const Ride = require("../models/Ride");
const Post = require("../models/Post");
const AppError = require("../utils/AppError");

exports.globalSearch = async ({ query, type, status, dateFrom, dateTo }) => {
  if (!query || !query.trim()) throw new AppError("Search query required", 400, "MISSING_QUERY");

  const regex = new RegExp(escapeRegex(query.trim()), "i");

  const results = {};

  if (!type || type === "users")
    results.users = await User.find({ username: { $regex: regex } })
      .select("username profilePic bio")
      .limit(10)
      .lean();

  if (!type || type === "clubs")
    results.clubs = await Club.find({ name: { $regex: regex } })
      .select("name description")
      .limit(10)
      .lean();

  if (!type || type === "rides") {
    const rideFilter = { title: { $regex: regex } };
    if (status) rideFilter.status = status;
    if (dateFrom || dateTo) {
      rideFilter.rideDate = {};
      if (dateFrom) rideFilter.rideDate.$gte = new Date(dateFrom);
      if (dateTo) rideFilter.rideDate.$lte = new Date(dateTo);
    }
    results.rides = await Ride.find(rideFilter)
      .populate("createdBy", "username")
      .limit(10)
      .lean();
  }

  if (!type || type === "posts")
    results.posts = await Post.find({ content: { $regex: regex } })
      .populate("author", "username")
      .limit(10)
      .lean();

  return results;
};

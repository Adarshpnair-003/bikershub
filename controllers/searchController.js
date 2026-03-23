const { escapeRegex } = require("../utils/sanitize");
const User = require("../models/User");
const Club = require("../models/Club");
const Ride = require("../models/Ride");
const Post = require("../models/Post");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const apiResponse = require("../utils/apiResponse");

exports.globalSearch = catchAsync(async (req, res, next) => {
  const query = (req.query.q || "").trim();

  if (!query) {
    return next(new AppError("Search query required", 400, "MISSING_QUERY"));
  }

  const safeQuery = escapeRegex(query);
  const regex = new RegExp(safeQuery, "i");

  const [users, clubs, rides, posts] = await Promise.all([
    User.find({ username: { $regex: regex } })
      .select("username profilePic")
      .limit(10)
      .lean(),

    Club.find({ name: { $regex: regex } })
      .select("name description")
      .limit(10)
      .lean(),

    Ride.find({ title: { $regex: regex } })
      .populate("createdBy", "username")
      .limit(10)
      .lean(),

    Post.find({ content: { $regex: regex } })   // was "caption" — fixed to "content"
      .populate("author", "username")
      .limit(10)
      .lean()
  ]);

  res.json(apiResponse.success({ users, clubs, rides, posts }, "Search results"));
});

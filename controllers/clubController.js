const Club = require("../models/Club");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const Conversation = require("../models/Conversation");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const apiResponse = require("../utils/apiResponse");

/* CREATE CLUB */
exports.createClub = catchAsync(async (req, res) => {
  const { name, description, location, isPrivate } = req.body;

  const existing = await Club.findOne({ name });
  if (existing)
    return res.status(400).json(apiResponse.error("Club name already exists", "CLUB_EXISTS"));

  const club = await Club.create({
    name,
    description,
    location,
    isPrivate,
    owner: req.user.id,
    admins: [req.user.id],
    members: [req.user.id]
  });

  /* create club chat */
  await Conversation.create({
    type: "club",
    club: club._id,
    participants: [req.user.id]
  });

  res.status(201).json(apiResponse.success(club, "Club created"));
});


/* REQUEST TO JOIN CLUB */
exports.requestJoinClub = catchAsync(async (req, res, next) => {
  const club = await Club.findById(req.params.id);

  if (!club)
    return next(new AppError("Club not found", 404, "NOT_FOUND"));

  if (club.members.map(m => m.toString()).includes(req.user.id)) {
    return next(new AppError("Already a member", 400, "ALREADY_MEMBER"));
  }

  if (!club.isPrivate) {
    club.members.push(req.user.id);
    await club.save();
    return res.json(apiResponse.success(null, "Joined public club"));
  }

  if (club.joinRequests.includes(req.user.id))
    return next(new AppError("Already requested", 400, "ALREADY_REQUESTED"));

  club.joinRequests.push(req.user.id);
  await club.save();

  await Notification.create({
    recipient: club.owner,
    sender: req.user.id,
    type: "club_request",
    club: club._id
  });

  res.json(apiResponse.success(null, "Join request sent"));
});


/* GET JOIN REQUESTS */
exports.getJoinRequests = catchAsync(async (req, res, next) => {
  const club = await Club.findById(req.params.id)
    .populate("joinRequests", "username email");

  if (!club)
    return next(new AppError("Club not found", 404, "NOT_FOUND"));

  if (!club.admins.map(a => a.toString()).includes(req.user.id) &&
      club.owner.toString() !== req.user.id) {
    return next(new AppError("Not authorized", 403, "FORBIDDEN"));
  }

  res.json(apiResponse.success(club.joinRequests));
});


/* APPROVE REQUEST */
exports.approveRequest = catchAsync(async (req, res, next) => {
  const club = await Club.findById(req.params.clubId);

  if (!club)
    return next(new AppError("Club not found", 404, "NOT_FOUND"));

  if (!club.admins.map(a => a.toString()).includes(req.user.id) &&
      club.owner.toString() !== req.user.id) {
    return next(new AppError("Not authorized", 403, "FORBIDDEN"));
  }

  club.members.push(req.params.userId);

  club.joinRequests = club.joinRequests.filter(
    id => id.toString() !== req.params.userId
  );

  await club.save();

  await Notification.create({
    recipient: req.params.userId,
    sender: req.user.id,
    type: "club_approved",
    club: club._id
  });

  res.json(apiResponse.success(null, "User approved"));
});


/* REJECT REQUEST */
exports.rejectRequest = catchAsync(async (req, res, next) => {
  const club = await Club.findById(req.params.clubId);

  if (!club)
    return next(new AppError("Club not found", 404, "NOT_FOUND"));

  if (!club.admins.map(a => a.toString()).includes(req.user.id) &&
      club.owner.toString() !== req.user.id) {
    return next(new AppError("Not authorized", 403, "FORBIDDEN"));
  }

  club.joinRequests = club.joinRequests.filter(
    id => id.toString() !== req.params.userId
  );

  await club.save();

  await Notification.create({
    recipient: req.params.userId,
    sender: req.user.id,
    type: "club_rejected",
    club: club._id
  });

  res.json(apiResponse.success(null, "User rejected"));
});


/* LEAVE CLUB */
exports.leaveClub = catchAsync(async (req, res, next) => {
  const club = await Club.findById(req.params.clubId);

  if (!club)
    return next(new AppError("Club not found", 404, "NOT_FOUND"));

  club.members = club.members.filter(
    m => m.toString() !== req.user.id
  );

  await club.save();

  res.json(apiResponse.success(null, "Left club successfully"));
});


/* CREATE CLUB POST */
exports.createClubPost = catchAsync(async (req, res, next) => {
  const club = await Club.findById(req.params.clubId);

  if (!club)
    return next(new AppError("Club not found", 404, "NOT_FOUND"));

  if (!club.members.map(m => m.toString()).includes(req.user.id))
    return next(new AppError("Members only", 403, "FORBIDDEN"));

  const post = await Post.create({
    content: req.body.content,
    author: req.user.id,
    club: club._id
  });

  const populated = await post.populate("author", "username email");

  res.status(201).json(apiResponse.success(populated, "Post created"));
});


/* GET CLUB POSTS */
exports.getClubPosts = catchAsync(async (req, res) => {
  const posts = await Post.find({ club: req.params.clubId })
    .populate("author", "username email")
    .sort({ createdAt: -1 });

  res.json(apiResponse.success(posts));
});


/* GET CLUB DETAILS */
exports.getClubDetails = catchAsync(async (req, res, next) => {
  const club = await Club.findById(req.params.clubId)
    .populate("owner admins members", "username email");

  if (!club)
    return next(new AppError("Club not found", 404, "NOT_FOUND"));

  res.json(apiResponse.success(club));
});

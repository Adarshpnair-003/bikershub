const clubService = require("../services/clubService");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");

exports.createClub = catchAsync(async (req, res) => {
  const club = await clubService.create(req.user.id, req.body);
  res.status(201).json(apiResponse.success(club, "Club created"));
});

exports.getClubDetails = catchAsync(async (req, res) => {
  const club = await clubService.getDetails(req.params.clubId);
  res.json(apiResponse.success(club));
});

exports.requestJoinClub = catchAsync(async (req, res) => {
  const result = await clubService.requestJoin(req.params.clubId, req.user.id);
  res.json(apiResponse.success(null, result.msg));
});

exports.getJoinRequests = catchAsync(async (req, res) => {
  const requests = await clubService.getJoinRequests(req.params.clubId, req.user.id);
  res.json(apiResponse.success(requests));
});

exports.approveRequest = catchAsync(async (req, res) => {
  await clubService.approve(req.params.clubId, req.params.userId, req.user.id);
  res.json(apiResponse.success(null, "User approved"));
});

exports.rejectRequest = catchAsync(async (req, res) => {
  await clubService.reject(req.params.clubId, req.params.userId, req.user.id);
  res.json(apiResponse.success(null, "User rejected"));
});

exports.leaveClub = catchAsync(async (req, res) => {
  await clubService.leave(req.params.clubId, req.user.id);
  res.json(apiResponse.success(null, "Left club successfully"));
});

exports.createClubPost = catchAsync(async (req, res) => {
  const post = await clubService.createPost(req.params.clubId, req.user.id, req.body.content);
  res.status(201).json(apiResponse.success(post, "Post created"));
});

exports.getClubPosts = catchAsync(async (req, res) => {
  const posts = await clubService.getPosts(req.params.clubId);
  res.json(apiResponse.success(posts));
});

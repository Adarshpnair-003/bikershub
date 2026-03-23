const postService = require("../services/postService");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");

exports.createPost = catchAsync(async (req, res) => {
  const post = await postService.create(req.user.id, req.body, req.files);
  res.status(201).json(apiResponse.success(post, "Post created"));
});

exports.getAllPosts = catchAsync(async (req, res) => {
  const result = await postService.getAll({ page: req.query.page, limit: req.query.limit });
  res.json(apiResponse.paginated(result.posts, result.pagination));
});

exports.getSmartFeed = catchAsync(async (req, res) => {
  const result = await postService.getFeed(req.user.id, { page: req.query.page, limit: req.query.limit });
  res.json(apiResponse.paginated(result.posts, result.pagination));
});

exports.getPost = catchAsync(async (req, res) => {
  const post = await postService.getById(req.params.id);
  res.json(apiResponse.success(post));
});

exports.likePost = catchAsync(async (req, res) => {
  const result = await postService.like(req.params.id, req.user.id, req.io);
  res.json(apiResponse.success(result));
});

exports.updatePost = catchAsync(async (req, res) => {
  const post = await postService.update(req.params.id, req.user.id, req.body, req.files);
  res.json(apiResponse.success(post, "Post updated"));
});

exports.deletePost = catchAsync(async (req, res) => {
  await postService.delete(req.params.id, req.user.id);
  res.json(apiResponse.success(null, "Post deleted successfully"));
});

const commentService = require("../services/commentService");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");

exports.createComment = catchAsync(async (req, res) => {
  const comment = await commentService.create({
    postId: req.params.postId,
    content: req.body.content,
    parentComment: req.body.parentComment,
    authorId: req.user.id,
    io: req.io
  });
  res.status(201).json(apiResponse.success(comment, "Comment created"));
});

exports.getComments = catchAsync(async (req, res) => {
  const { page, limit } = req.query;
  const { comments, pagination } = await commentService.getByPost(req.params.postId, { page, limit });
  res.json(apiResponse.paginated(comments, pagination, "Comments fetched"));
});

exports.likeComment = catchAsync(async (req, res) => {
  const result = await commentService.like(req.params.commentId, req.user.id, req.io);
  res.json(apiResponse.success(result));
});

exports.deleteComment = catchAsync(async (req, res) => {
  await commentService.delete(req.params.commentId, req.user.id);
  res.json(apiResponse.success(null, "Comment deleted successfully"));
});

const Comment = require("../models/Comment");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const AppError = require("../utils/AppError");

exports.create = async ({ postId, content, parentComment, authorId, io }) => {
  const post = await Post.findById(postId);
  if (!post) throw new AppError("Post not found", 404, "NOT_FOUND");
  const comment = await Comment.create({ content, author: authorId, post: postId, parentComment: parentComment || null });
  await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
  // Notify post owner
  if (post.author.toString() !== authorId) {
    await Notification.create({ recipient: post.author, sender: authorId, type: "comment", post: postId });
  }
  // Notify parent comment owner
  if (parentComment) {
    const parent = await Comment.findById(parentComment);
    if (parent && parent.author.toString() !== authorId) {
      await Notification.create({ recipient: parent.author, sender: authorId, type: "reply", post: postId });
    }
  }
  const populated = await comment.populate("author", "username profilePic");
  if (io) io.to(`post:${postId}`).emit("newComment", populated.toObject());
  return populated;
};

exports.getByPost = async (postId, { page = 1, limit = 50 } = {}) => {
  const skip = (page - 1) * limit;
  // Fetch top-level comments (paginated) and all their replies
  const [topLevel, topTotal] = await Promise.all([
    Comment.find({ post: postId, parentComment: null })
      .populate("author", "username profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Comment.countDocuments({ post: postId, parentComment: null })
  ]);

  // Get IDs of top-level comments to fetch their replies
  const topIds = topLevel.map(c => c._id);
  const replies = topIds.length > 0
    ? await Comment.find({ post: postId, parentComment: { $in: topIds } })
        .populate("author", "username profilePic")
        .sort({ createdAt: 1 })
        .lean()
    : [];

  // Combine: top-level + their replies, frontend separates them
  const comments = [...topLevel, ...replies];
  return {
    comments,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: topTotal,
      totalPages: Math.ceil(topTotal / limit),
      hasMore: skip + topLevel.length < topTotal
    }
  };
};

exports.like = async (commentId, userId, io) => {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new AppError("Comment not found", 404, "NOT_FOUND");
  const alreadyLiked = comment.likes.some(id => id.toString() === userId);
  if (alreadyLiked) {
    comment.likes = comment.likes.filter(id => id.toString() !== userId);
  } else {
    comment.likes.push(userId);
  }
  await comment.save();
  if (io) io.to(`post:${comment.post}`).emit("commentLiked", { commentId: comment._id, likesCount: comment.likes.length });
  return { liked: !alreadyLiked, likesCount: comment.likes.length };
};

exports.delete = async (commentId, userId) => {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new AppError("Comment not found", 404, "NOT_FOUND");
  const post = await Post.findById(comment.post);
  const isAuthor = comment.author.toString() === userId;
  const isPostOwner = post && post.author.toString() === userId;
  if (!isAuthor && !isPostOwner) throw new AppError("Unauthorized", 403, "FORBIDDEN");
  comment.isDeleted = true;
  comment.content = "This comment was deleted";
  await comment.save();
  await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });
};

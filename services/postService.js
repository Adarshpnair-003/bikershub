const cloudinary = require("../config/cloudinary");
const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const AppError = require("../utils/AppError");
const fs = require("fs");

async function uploadFiles(files) {
  const results = await Promise.all(
    files.map(f => cloudinary.uploader.upload(f.path, {
      folder: "bikerhub/posts",
      resource_type: "auto",
      quality: "auto",
      fetch_format: "auto"
    }))
  );
  // Clean up temp files
  await Promise.all(files.map(f => f.path ? fs.promises.unlink(f.path).catch(() => {}) : Promise.resolve()));
  return results.map(r => ({
    url: r.secure_url,
    public_id: r.public_id,
    type: r.resource_type,
    thumbnail: r.resource_type === "video"
      ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/so_1/${r.public_id}.jpg`
      : null
  }));
}

exports.create = async (authorId, body, files) => {
  let media = [];
  if (files && files.length > 0) {
    try {
      media = await uploadFiles(files);
    } catch (err) {
      // Clean up on error
      await Promise.all((files || []).map(f => f.path ? fs.promises.unlink(f.path).catch(() => {}) : Promise.resolve()));
      throw err;
    }
  }
  const post = await Post.create({ author: authorId, content: body.content, club: body.club || null, media });
  return post.populate("author", "username profilePic");
};

exports.getAll = async ({ page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [posts, total] = await Promise.all([
    Post.find().populate("author", "username profilePic").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Post.countDocuments()
  ]);
  return { posts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

exports.getFeed = async (userId, { page = 1, limit = 10 } = {}) => {
  const user = await User.findById(userId).select("following").lean();
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  const authorIds = [...(user.following || []), userId];
  const skip = (page - 1) * limit;
  const [posts, total] = await Promise.all([
    Post.find({ author: { $in: authorIds } }).populate("author", "username profilePic").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Post.countDocuments({ author: { $in: authorIds } })
  ]);
  return { posts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

exports.getById = async (postId) => {
  const post = await Post.findById(postId).populate("author", "username profilePic").lean();
  if (!post) throw new AppError("Post not found", 404, "NOT_FOUND");
  return post;
};

exports.like = async (postId, userId, io) => {
  const post = await Post.findById(postId);
  if (!post) throw new AppError("Post not found", 404, "NOT_FOUND");
  const alreadyLiked = post.likes.some(id => id.toString() === userId);
  if (alreadyLiked) {
    post.likes = post.likes.filter(id => id.toString() !== userId);
  } else {
    post.likes.push(userId);
    if (post.author.toString() !== userId) {
      await Notification.create({ recipient: post.author, sender: userId, type: "like", post: post._id });
    }
  }
  await post.save();
  // Room-based emit (only users viewing this post)
  if (io) io.to(`post:${postId}`).emit("postLiked", { postId: post._id, likesCount: post.likes.length });
  return { liked: !alreadyLiked, likesCount: post.likes.length };
};

exports.update = async (postId, userId, body, files) => {
  const post = await Post.findById(postId);
  if (!post) throw new AppError("Post not found", 404, "NOT_FOUND");
  if (post.author.toString() !== userId) throw new AppError("Not authorized", 403, "FORBIDDEN");
  if (files && files.length > 0 && post.media.length > 0) {
    await Promise.all(post.media.map(m => cloudinary.uploader.destroy(m.public_id, { resource_type: m.type })));
  }
  if (files && files.length > 0) {
    post.media = await uploadFiles(files);
  }
  if (body.content) post.content = body.content;
  await post.save();
  return post;
};

exports.delete = async (postId, userId) => {
  const post = await Post.findById(postId);
  if (!post) throw new AppError("Post not found", 404, "NOT_FOUND");
  if (post.author.toString() !== userId) throw new AppError("Not authorized", 403, "FORBIDDEN");
  if (post.media && post.media.length > 0) {
    await Promise.all(post.media.map(m => cloudinary.uploader.destroy(m.public_id, { resource_type: m.type })));
  }
  await post.deleteOne();
};

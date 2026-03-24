const Post = require("../../models/Post");

/**
 * Create a single test post for the given author.
 * Required Post fields: content (String, required), author (ObjectId, required).
 */
exports.createPost = async (authorId, overrides = {}) => {
  const n = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  return Post.create({
    author: authorId,
    content: `Test post content #${n}`,
    media: [],
    ...overrides
  });
};

/**
 * Create multiple test posts for the given author.
 */
exports.createPosts = async (authorId, count = 3) => {
  return Promise.all(
    Array.from({ length: count }, () => exports.createPost(authorId))
  );
};

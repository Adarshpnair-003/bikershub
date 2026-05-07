const Comment = require("../models/Comment");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const { getIO } = require("../socket/socket");
const { resolveMentionedUserIds } = require("../utils/mentions");
/*
CREATE COMMENT OR REPLY
*/
exports.createComment = async (req, res) => {
  try {

    const { content, parentComment } = req.body;
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post)
      return res.status(404).json({ msg: "Post not found" });

    // 🏷 PARSE @MENTIONS
    const mentionedUserIds = await resolveMentionedUserIds(content || "", req.user.id);

    const comment = await Comment.create({
      content,
      author: req.user.id,
      post: postId,
      parentComment: parentComment || null,
      mentions: mentionedUserIds
    });
    /* REALTIME COMMENT */
const io = getIO();

const populatedComment = await comment.populate("author", "username");

io.to(`post:${postId}`).emit("newComment", populatedComment);

    // 🔔 NOTIFICATIONS for mentions (skip if same user is already getting a comment-notif)
    if (mentionedUserIds.length > 0) {
      const postOwnerId = post.author.toString();
      Notification.insertMany(
        mentionedUserIds
          .filter((uid) => String(uid) !== postOwnerId) // post owner already gets a "comment" notif
          .map((uid) => ({
            recipient: uid,
            sender: req.user.id,
            type: "mention",
            post: postId
          }))
      ).catch((err) => console.warn("[mention notify] insert failed:", err.message));
    }

    await Post.findByIdAndUpdate(postId, {
      $inc: { commentsCount: 1 }
    });

    /* NOTIFY POST OWNER */
    if (post.author.toString() !== req.user.id) {

      await Notification.create({
        recipient: post.author,
        sender: req.user.id,
        type: "comment",
        post: postId
      });

    }

    /* NOTIFY PARENT COMMENT OWNER */
    if (parentComment) {

      const parent = await Comment.findById(parentComment);

      if (parent && parent.author.toString() !== req.user.id) {

        await Notification.create({
          recipient: parent.author,
          sender: req.user.id,
          type: "reply",
          post: postId
        });

      }

    }

    res.status(201).json(comment);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/*
GET COMMENTS WITH PAGINATION
*/
exports.getComments = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({
      post: req.params.postId,
      parentComment: null,
      isDeleted: false
    })
      .populate("author", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(comments);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/*
LIKE / UNLIKE COMMENT
*/
exports.likeComment = async (req, res) => {
  try {

    const comment = await Comment.findById(req.params.commentId);

    if (!comment)
      return res.status(404).json({ msg: "Comment not found" });

    const alreadyLiked = comment.likes.includes(req.user.id);

    if (alreadyLiked) {

      comment.likes = comment.likes.filter(
        id => id.toString() !== req.user.id
      );

    } else {

      comment.likes.push(req.user.id);

    }

    await comment.save();
    /* REALTIME LIKE UPDATE */
const io = getIO();

io.to(`post:${comment.post}`).emit("commentLiked", {
  commentId: comment._id,
  likesCount: comment.likes.length
});

    res.json({
      likesCount: comment.likes.length,
      liked: !alreadyLiked
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/*
DELETE COMMENT (SOFT DELETE)
*/
exports.deleteComment = async (req, res) => {
  try {

    const comment = await Comment.findById(req.params.commentId);

    if (!comment)
      return res.status(404).json({ msg: "Comment not found" });

    const post = await Post.findById(comment.post);

    if (!post)
      return res.status(404).json({ msg: "Post not found" });

    const isCommentAuthor = comment.author.toString() === req.user.id;
    const isPostOwner = post.author.toString() === req.user.id;

    if (!isCommentAuthor && !isPostOwner)
      return res.status(403).json({ msg: "Unauthorized" });

    comment.isDeleted = true;
    comment.content = "This comment was deleted";

    await comment.save();

    await Post.findByIdAndUpdate(comment.post, {
      $inc: { commentsCount: -1 }
    });

    res.json({ msg: "Comment deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
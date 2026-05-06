const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { getIO } = require("../socket/socket");
const cloudinary = require("../config/cloudinary"); // ✅ ADD THIS
const fs = require("fs/promises");

const cleanupLocalFiles = async files => {
  if (!files || files.length === 0) return;

  await Promise.all(
    files
      .map(file => file && file.path)
      .filter(Boolean)
      .map(async filePath => {
        try {
          await fs.unlink(filePath);
        } catch (err) {
          if (err.code !== "ENOENT") {
            console.warn(`TEMP FILE CLEANUP FAILED: ${filePath}`, err.message);
          }
        }
      })
  );
};

/* CREATE POST WITH MEDIA */
exports.createPost = async (req, res) => {
  try {
    const files = req.files;
    const body = req.body || {};
    const content = (body.content || body.text || "").trim();
    let media = [];

    const hasPoll = !!body.poll;
    if (!content && (!files || files.length === 0) && !hasPoll) {
      return res.status(400).json({ msg: "Post content, media, or poll is required" });
    }

    // ✅ HANDLE MULTIPLE MEDIA UPLOAD
    if (files && files.length > 0) {
      const results = await Promise.all(
        files.map(file =>
          cloudinary.uploader.upload(file.path, {
            folder: "bikerhub/posts",
            resource_type: "auto",
            // 🔥 IMAGE + VIDEO OPTIMIZATION
  quality: "auto",
  fetch_format: "auto",

  // 🎥 VIDEO SETTINGS
  chunk_size: 6000000 // better for large video
          })
        )
      );

     media = results.map(item => ({
  url: item.secure_url,
  public_id: item.public_id,
  type: item.resource_type,
  thumbnail:
    item.resource_type === "video"
      ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/so_1/${item.public_id}.jpg`
      : null
}));

      // 🧹 DELETE TEMP FILES
      await cleanupLocalFiles(files);
    }

    // 📊 OPTIONAL POLL — multipart sends JSON-stringified
    let poll;
    if (body.poll) {
      let raw;
      try {
        raw = typeof body.poll === "string" ? JSON.parse(body.poll) : body.poll;
      } catch {
        return res.status(400).json({ success: false, error: { code: "INVALID_POLL", message: "Poll payload is not valid JSON" } });
      }
      const options = Array.isArray(raw.options) ? raw.options : [];
      const labels = options.map((o) => (o && typeof o.label === "string" ? o.label.trim() : "")).filter(Boolean);
      if (labels.length < 2 || labels.length > 4) {
        return res.status(400).json({ success: false, error: { code: "INVALID_POLL", message: "Poll must have 2 to 4 options" } });
      }
      if (labels.some((l) => l.length > 60)) {
        return res.status(400).json({ success: false, error: { code: "INVALID_POLL", message: "Each option must be 60 characters or fewer" } });
      }
      const lower = labels.map((l) => l.toLowerCase());
      if (new Set(lower).size !== lower.length) {
        return res.status(400).json({ success: false, error: { code: "INVALID_POLL", message: "Poll options must be unique" } });
      }
      let closesAt = null;
      if (raw.closesAt) {
        const parsed = new Date(raw.closesAt);
        if (isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
          return res.status(400).json({ success: false, error: { code: "INVALID_POLL", message: "Poll close time must be in the future" } });
        }
        closesAt = parsed;
      }
      poll = {
        options: labels.map((label) => ({ label, votes: [] })),
        multiSelect: Boolean(raw.multiSelect),
        closesAt,
        closed: false
      };
    }

    // ✅ CREATE POST
    const post = await Post.create({
      author: req.user.id,
      content,
      club: body.club || null,
      media, // 👈 NEW FIELD
      ...(poll ? { poll } : {})
    });

    const populatedPost = await post.populate("author", "username email");

    // 🔥 REAL-TIME EVENT
    const io = getIO();
    io.emit("newPost", populatedPost);

    res.status(201).json({ success: true, data: populatedPost, message: "Post created" });

  } catch (error) {
    console.error("CREATE POST ERROR:", error);

    // ⚠️ CLEANUP IF ERROR
    await cleanupLocalFiles(req.files);

    res.status(500).json({ error: error.message });
  }
};


/* GET ALL POSTS (GLOBAL FEED) */
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", "username email")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: posts });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* GET SINGLE POST */
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "username profilePic email")
      .populate("club", "name");
    if (!post) return res.status(404).json({ success: false, error: { message: "Post not found" } });
    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/* LIKE / UNLIKE POST */
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post)
      return res.status(404).json({ msg: "Post not found" });

    const alreadyLiked = post.likes.includes(req.user.id);

    if (alreadyLiked) {
      post.likes = post.likes.filter(
        id => id.toString() !== req.user.id
      );
    } else {
      post.likes.push(req.user.id);

      /* CREATE NOTIFICATION */
      if (post.author.toString() !== req.user.id) {
        await Notification.create({
          recipient: post.author,
          sender: req.user.id,
          type: "like",
          post: post._id
        });
      }
    }

    await post.save();

    /* REALTIME LIKE UPDATE */
    const io = getIO();

    io.emit("postLiked", {
      postId: post._id,
      likesCount: post.likes.length
    });

    res.json({
      success: true,
      data: {
        liked: !alreadyLiked,
        likesCount: post.likes.length
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* SMART FEED (FOLLOWING USERS) */
exports.getSmartFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user.id);

    if (!currentUser)
      return res.status(404).json({ msg: "User not found" });

    const usersForFeed = [
      ...currentUser.following,
      req.user.id
    ];

    const posts = await Post.find({
      author: { $in: usersForFeed }
    })
      .populate("author", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments({
      author: { $in: usersForFeed }
    });

    res.json({
      success: true,
      data: {
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        posts
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post)
      return res.status(404).json({ msg: "Post not found" });

    // 🔐 Optional: check owner
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // 🗑️ DELETE MEDIA FROM CLOUDINARY
    if (post.media && post.media.length > 0) {
      for (let item of post.media) {
        await cloudinary.uploader.destroy(item.public_id, {
          resource_type: item.type
        });
      }
    }

    await post.deleteOne();

    res.json({
      success: true,
      data: { postId: post._id },
      message: "Post deleted successfully"
    });

  } catch (error) {
    console.error("DELETE POST ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const body = req.body || {};

    if (!post)
      return res.status(404).json({ msg: "Post not found" });

    // 🔐 check ownership
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    const files = req.files;

    // 🗑️ DELETE OLD MEDIA IF NEW FILES PROVIDED
    if (files && files.length > 0 && post.media.length > 0) {
      for (let item of post.media) {
        await cloudinary.uploader.destroy(item.public_id, {
          resource_type: item.type
        });
      }
    }

    let media = post.media;

    // 📤 UPLOAD NEW MEDIA
    if (files && files.length > 0) {
      const results = await Promise.all(
        files.map(file =>
          cloudinary.uploader.upload(file.path, {
            folder: "bikerhub/posts",
            resource_type: "auto",
            quality: "auto",         // 🔥 optimization
            fetch_format: "auto"
          })
        )
      );

      media = results.map(item => ({
        url: item.secure_url,
        public_id: item.public_id,
        type: item.resource_type
      }));

      // 🧹 delete temp files
      await cleanupLocalFiles(files);
    }

    // ✏️ UPDATE FIELDS
    post.content = body.content || body.text || post.content;
    post.media = media;

    await post.save();
    const populatedPost = await post.populate("author", "username email");

    res.json({
      success: true,
      data: populatedPost,
      message: "Post updated"
    });

  } catch (error) {
    console.error("UPDATE POST ERROR:", error);
    await cleanupLocalFiles(req.files);
    res.status(500).json({ error: error.message });
  }
};

/* VOTE ON A POLL OPTION (toggle) */
exports.voteOnPoll = async (req, res) => {
  try {
    const { optionId } = req.body || {};
    if (!optionId) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "optionId is required" } });
    }

    const post = await Post.findById(req.params.id);
    if (!post || !post.poll) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Poll not found" } });
    }

    const poll = post.poll;
    if (poll.closed || (poll.closesAt && new Date(poll.closesAt).getTime() <= Date.now())) {
      // Auto-mark closed if the deadline passed
      if (!poll.closed) poll.closed = true;
      return res.status(400).json({ success: false, error: { code: "POLL_CLOSED", message: "This poll has closed" } });
    }

    const target = poll.options.id(optionId);
    if (!target) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Option not found" } });
    }

    const userId = String(req.user.id);
    const alreadyVoted = target.votes.some((v) => String(v) === userId);

    if (poll.multiSelect) {
      target.votes = alreadyVoted
        ? target.votes.filter((v) => String(v) !== userId)
        : [...target.votes, req.user.id];
    } else {
      // Single-choice: clear vote from all options first, then either toggle off or set this one
      poll.options.forEach((opt) => {
        opt.votes = opt.votes.filter((v) => String(v) !== userId);
      });
      if (!alreadyVoted) target.votes.push(req.user.id);
    }

    post.markModified("poll");
    await post.save();

    // Realtime broadcast (room-based — keeps existing pattern lightweight)
    try {
      const io = getIO();
      io.emit("pollUpdated", { postId: post._id, poll: post.poll });
    } catch { /* socket optional */ }

    res.json({ success: true, data: post.poll, message: alreadyVoted && !poll.multiSelect ? "Vote cleared" : "Vote recorded" });
  } catch (error) {
    console.error("POLL VOTE ERROR:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/* CLOSE A POLL (author only) */
exports.closePoll = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || !post.poll) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Poll not found" } });
    }
    if (String(post.author) !== String(req.user.id)) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Only the author can close this poll" } });
    }
    post.poll.closed = true;
    post.markModified("poll");
    await post.save();

    try {
      const io = getIO();
      io.emit("pollUpdated", { postId: post._id, poll: post.poll });
    } catch { /* socket optional */ }

    res.json({ success: true, data: post.poll, message: "Poll closed" });
  } catch (error) {
    console.error("POLL CLOSE ERROR:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};
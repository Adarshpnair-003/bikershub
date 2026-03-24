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

    if (!content && (!files || files.length === 0)) {
      return res.status(400).json({ msg: "Post content or media is required" });
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

    // ✅ CREATE POST
    const post = await Post.create({
      author: req.user.id,
      content,
      club: body.club || null,
      media // 👈 NEW FIELD
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
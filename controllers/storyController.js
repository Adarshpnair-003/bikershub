const Story = require("../models/Story");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const fs = require("fs/promises");

async function unlinkSafe(p) {
  if (!p) return;
  try { await fs.unlink(p); } catch { /* ignore */ }
}

/* CREATE STORY (multipart, single media) */
exports.createStory = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: { code: "MEDIA_REQUIRED", message: "A photo or video is required" } });
    }

    const upload = await cloudinary.uploader.upload(file.path, {
      folder: "bikerhub/stories",
      resource_type: "auto",
      quality: "auto",
      fetch_format: "auto"
    });
    await unlinkSafe(file.path);

    const story = await Story.create({
      user: req.user.id,
      media: {
        url: upload.secure_url,
        public_id: upload.public_id,
        type: upload.resource_type === "video" ? "video" : "image"
      },
      caption: (req.body?.caption || "").trim().slice(0, 200),
      expiresAt: Story.makeExpiry()
    });

    res.status(201).json({ success: true, data: story, message: "Story posted" });
  } catch (err) {
    console.error("CREATE STORY ERROR:", err);
    if (req.file?.path) await unlinkSafe(req.file.path);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/* GET STORY FEED — followed users + self, grouped */
exports.getFeed = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select("following").lean();
    const userIds = [req.user.id, ...((me?.following) || []).map(String)];

    const stories = await Story.find({
      user: { $in: userIds },
      expiresAt: { $gt: new Date() }
    })
      .populate("user", "username profilePic")
      .sort({ createdAt: -1 })
      .lean();

    // Group by user, preserve newest-first ordering by group recency
    const map = new Map();
    for (const s of stories) {
      const uid = String(s.user._id);
      if (!map.has(uid)) {
        map.set(uid, {
          user: s.user,
          stories: [],
          latestAt: s.createdAt,
          allViewed: true
        });
      }
      const group = map.get(uid);
      group.stories.push(s);
      const seen = Array.isArray(s.viewers) && s.viewers.some((v) => String(v) === String(req.user.id));
      if (!seen && String(s.user._id) !== String(req.user.id)) group.allViewed = false;
    }

    const groups = Array.from(map.values())
      .sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt));

    res.json({ success: true, data: groups });
  } catch (err) {
    console.error("GET STORY FEED ERROR:", err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/* GET STORIES FOR A SPECIFIC USER */
exports.getUserStories = async (req, res) => {
  try {
    const stories = await Story.find({
      user: req.params.userId,
      expiresAt: { $gt: new Date() }
    })
      .populate("user", "username profilePic")
      .sort({ createdAt: 1 })
      .lean();

    res.json({ success: true, data: stories });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/* MARK AS VIEWED */
exports.markViewed = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Story not found" } });

    if (String(story.user) !== String(req.user.id)) {
      const already = story.viewers.some((v) => String(v) === String(req.user.id));
      if (!already) {
        story.viewers.push(req.user.id);
        await story.save();
      }
    }
    res.json({ success: true, data: { viewersCount: story.viewers.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/* DELETE OWN STORY */
exports.deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Story not found" } });
    if (String(story.user) !== String(req.user.id)) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Not your story" } });
    }
    if (story.media?.public_id) {
      cloudinary.uploader.destroy(story.media.public_id, { resource_type: story.media.type === "video" ? "video" : "image" })
        .catch((e) => console.warn("[story] destroy failed:", e.message));
    }
    await story.deleteOne();
    res.json({ success: true, data: null, message: "Story deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

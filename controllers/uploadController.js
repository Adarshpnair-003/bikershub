const cloudinary = require("../config/cloudinary");
const fs = require("fs/promises");
const User = require("../models/User");

const safeUnlink = async (filePath) => {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`TEMP FILE CLEANUP FAILED: ${filePath}`, error.message);
    }
  }
};

const safeUnlinkMany = async (files = []) => {
  await Promise.all(files.map((file) => safeUnlink(file && file.path)));
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "bikerhub",
      resource_type: "auto"
    });

    await safeUnlink(req.file.path);

    res.json({
      success: true,
      url: result.secure_url
    });

  } catch (error) {
    console.error(error);

    await safeUnlink(req.file?.path);

    res.status(500).json({ error: error.message });
  }
};

exports.uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: "No files uploaded" });
    }

    const results = await Promise.all(
      req.files.map(file =>
        cloudinary.uploader.upload(file.path, {
          folder: "bikerhub/posts",
          resource_type: "auto"
        })
      )
    );

    await safeUnlinkMany(req.files);

    const media = results.map(item => ({
      url: item.secure_url,
      public_id: item.public_id,
      type: item.resource_type
    }));

    res.json({
      success: true,
      media
    });

  } catch (error) {
    console.error(error);

    await safeUnlinkMany(req.files || []);

    res.status(500).json({ error: error.message });
  }
};

exports.uploadProfilePic = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    // delete old profile pic
    if (user.profilePic?.public_id) {
      await cloudinary.uploader.destroy(user.profilePic.public_id);
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "bikerhub/profile"
    });

    await safeUnlink(req.file.path);

    user.profilePic = {
      url: result.secure_url,
      public_id: result.public_id
    };

    await user.save();

    res.json({
      success: true,
      profilePic: user.profilePic
    });

  } catch (error) {
    console.error(error);

    await safeUnlink(req.file?.path);

    res.status(500).json({ error: error.message });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { public_id, type } = req.body;

    await cloudinary.uploader.destroy(public_id, {
      resource_type: type || "image"
    });

    res.json({ success: true, msg: "Deleted successfully" });

  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
};
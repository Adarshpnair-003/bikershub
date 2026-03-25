const User = require("../models/User");
const Notification = require("../models/Notification");
const Post = require("../models/Post");

/* GET CURRENT USER */
exports.getCurrentUser = async (req, res) => {
  try {

    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("followers following", "username email");

    res.json({ success: true, data: user });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* UPDATE PROFILE */
exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = ['username', 'name', 'bio', 'phone', 'location', 'bikeBrand', 'bikeModel', 'bikeYear'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true })
      .select('-password');
    if (!user) return res.status(404).json({ success: false, error: { message: "User not found" } });
    res.json({ success: true, data: user, message: "Profile updated" });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message || "Update failed" } });
  }
};

/* FOLLOW USER */
exports.followUser = async (req, res) => {
  try {

    if (req.user.id === req.params.id) {
      return res.status(400).json({ msg: "You cannot follow yourself" });
    }

    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToFollow) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (currentUser.following.includes(req.params.id)) {
      return res.status(400).json({ msg: "Already following" });
    }

    currentUser.following.push(req.params.id);
    userToFollow.followers.push(req.user.id);

    await currentUser.save();
    await userToFollow.save();

    /* SEND FOLLOW NOTIFICATION */
    if (userToFollow._id.toString() !== req.user.id) {

      await Notification.create({
        recipient: userToFollow._id,
        sender: req.user.id,
        type: "follow"
      });

    }

    res.json({ msg: "User followed successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* UNFOLLOW USER */
exports.unfollowUser = async (req, res) => {
  try {

    const userToUnfollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToUnfollow) {
      return res.status(404).json({ msg: "User not found" });
    }

    currentUser.following = currentUser.following.filter(
      id => id.toString() !== req.params.id
    );

    userToUnfollow.followers = userToUnfollow.followers.filter(
      id => id.toString() !== req.user.id
    );

    await currentUser.save();
    await userToUnfollow.save();

    res.json({ msg: "User unfollowed successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* GET USER PROFILE */
exports.getUserProfile = async (req, res) => {
  try {

    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("followers following", "username");

    if (!user)
      return res.status(404).json({ msg: "User not found" });

    const posts = await Post.find({ author: req.params.id })
      .sort({ createdAt: -1 });

    /* CHECK FOLLOW STATUS */

    const currentUser = await User.findById(req.user.id);

    if (!currentUser) {
      return res.status(404).json({ msg: "Current user not found" });
    }

    const isFollowing = currentUser.following.includes(user._id);

    res.json({ success: true, data: { user, posts, followersCount: user.followers.length, followingCount: user.following.length, isFollowing } });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
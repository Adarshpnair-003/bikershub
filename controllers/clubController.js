const Club = require("../models/Club");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const Conversation = require("../models/Conversation");

/* GET ALL CLUBS */
exports.getAllClubs = async (req, res) => {
  try {
    const clubs = await Club.find()
      .select("name description location isPrivate members owner coverImage createdAt")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: clubs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* CREATE CLUB */
exports.createClub = async (req, res) => {
  try {

    const { name, description, location, isPrivate } = req.body;

    const existing = await Club.findOne({ name });
    if (existing)
      return res.status(400).json({ msg: "Club name already exists" });

    const club = await Club.create({
      name,
      description,
      location,
      isPrivate,
      owner: req.user.id,
      admins: [req.user.id],
      members: [req.user.id]
    });

    /* create club chat */
    await Conversation.create({
      type: "club",
      club: club._id,
      participants: [req.user.id]
    });

    res.status(201).json(club);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* REQUEST TO JOIN CLUB */
exports.requestJoinClub = async (req, res) => {
  try {

    const club = await Club.findById(req.params.id);

    if (!club)
      return res.status(404).json({ msg: "Club not found" });

    if (!club.isPrivate) {

      club.members.push(req.user.id);
      await club.save();

      return res.json({ msg: "Joined public club" });
    }

    if (club.joinRequests.includes(req.user.id))
      return res.status(400).json({ msg: "Already requested" });

    club.joinRequests.push(req.user.id);
    await club.save();

    await Notification.create({
      recipient: club.owner,
      sender: req.user.id,
      type: "club_request",
      club: club._id
    });

    res.json({ msg: "Join request sent" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* GET JOIN REQUESTS */
exports.getJoinRequests = async (req, res) => {
  try {

    const club = await Club.findById(req.params.id)
      .populate("joinRequests", "username email");

    if (!club)
      return res.status(404).json({ msg: "Club not found" });

    if (!club.admins.includes(req.user.id) &&
        club.owner.toString() !== req.user.id) {

      return res.status(403).json({ msg: "Not authorized" });
    }

    res.json(club.joinRequests);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* APPROVE REQUEST */
exports.approveRequest = async (req, res) => {
  try {

    const club = await Club.findById(req.params.clubId);

    club.members.push(req.params.userId);

    club.joinRequests = club.joinRequests.filter(
      id => id.toString() !== req.params.userId
    );

    await club.save();

    await Notification.create({
      recipient: req.params.userId,
      sender: req.user.id,
      type: "club_approved",
      club: club._id
    });

    res.json({ msg: "User approved" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* REJECT REQUEST */
exports.rejectRequest = async (req, res) => {
  try {

    const club = await Club.findById(req.params.clubId);

    club.joinRequests = club.joinRequests.filter(
      id => id.toString() !== req.params.userId
    );

    await club.save();

    await Notification.create({
      recipient: req.params.userId,
      sender: req.user.id,
      type: "club_rejected",
      club: club._id
    });

    res.json({ msg: "User rejected" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* LEAVE CLUB */
exports.leaveClub = async (req, res) => {
  try {

    const club = await Club.findById(req.params.clubId);

    club.members = club.members.filter(
      m => m.toString() !== req.user.id
    );

    await club.save();

    res.json({ msg: "Left club successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* CREATE CLUB POST */
exports.createClubPost = async (req, res) => {
  try {

    const club = await Club.findById(req.params.clubId);

    if (!club.members.includes(req.user.id))
      return res.status(403).json({ msg: "Members only" });

    const post = await Post.create({
      content: req.body.content,
      author: req.user.id,
      club: club._id
    });

    const populated = await post.populate("author", "username email");

    res.status(201).json(populated);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* GET CLUB POSTS */
exports.getClubPosts = async (req, res) => {
  try {

    const posts = await Post.find({ club: req.params.clubId })
      .populate("author", "username email")
      .sort({ createdAt: -1 });

    res.json(posts);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* GET CLUB DETAILS */
exports.getClubDetails = async (req, res) => {
  try {

    const club = await Club.findById(req.params.clubId)
      .populate("owner admins members", "username email");

    if (!club)
      return res.status(404).json({ msg: "Club not found" });

    res.json(club);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
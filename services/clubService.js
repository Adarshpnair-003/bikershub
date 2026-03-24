const Club = require("../models/Club");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const Conversation = require("../models/Conversation");
const AppError = require("../utils/AppError");

exports.create = async (ownerId, { name, description, location, locationName, isPrivate }) => {
  if (await Club.findOne({ name })) throw new AppError("Club name already exists", 400, "DUPLICATE_NAME");
  const clubData = { name, description, isPrivate, owner: ownerId, admins: [ownerId], members: [ownerId] };
  if (location) clubData.location = location;
  if (locationName) clubData.locationName = locationName;
  const club = await Club.create(clubData);
  await Conversation.create({ type: "club", club: club._id, participants: [ownerId] });
  return club;
};

exports.getDetails = async (clubId) => {
  const club = await Club.findById(clubId).populate("owner admins members", "username profilePic").lean();
  if (!club) throw new AppError("Club not found", 404, "NOT_FOUND");
  return club;
};

exports.requestJoin = async (clubId, userId) => {
  const club = await Club.findById(clubId);
  if (!club) throw new AppError("Club not found", 404, "NOT_FOUND");
  if (club.members.some(m => m.toString() === userId)) throw new AppError("Already a member", 400, "ALREADY_MEMBER");
  if (!club.isPrivate) {
    club.members.push(userId);
    await club.save();
    return { msg: "Joined public club" };
  }
  if (club.joinRequests.some(r => r.toString() === userId)) throw new AppError("Already requested", 400, "ALREADY_REQUESTED");
  club.joinRequests.push(userId);
  await club.save();
  await Notification.create({ recipient: club.owner, sender: userId, type: "club_request", club: club._id });
  return { msg: "Join request sent" };
};

exports.getJoinRequests = async (clubId, requesterId) => {
  const club = await Club.findById(clubId).populate("joinRequests", "username profilePic").lean();
  if (!club) throw new AppError("Club not found", 404, "NOT_FOUND");
  const isAdminOrOwner = club.admins.some(a => a._id.toString() === requesterId) || club.owner._id.toString() === requesterId;
  if (!isAdminOrOwner) throw new AppError("Not authorized", 403, "FORBIDDEN");
  return club.joinRequests;
};

exports.approve = async (clubId, targetUserId, requesterId) => {
  const club = await Club.findById(clubId);
  if (!club) throw new AppError("Club not found", 404, "NOT_FOUND");
  const isAdminOrOwner = club.admins.some(a => a.toString() === requesterId) || club.owner.toString() === requesterId;
  if (!isAdminOrOwner) throw new AppError("Not authorized", 403, "FORBIDDEN");
  club.members.push(targetUserId);
  club.joinRequests = club.joinRequests.filter(id => id.toString() !== targetUserId);
  await club.save();
  await Notification.create({ recipient: targetUserId, sender: requesterId, type: "club_approved", club: club._id });
};

exports.reject = async (clubId, targetUserId, requesterId) => {
  const club = await Club.findById(clubId);
  if (!club) throw new AppError("Club not found", 404, "NOT_FOUND");
  const isAdminOrOwner = club.admins.some(a => a.toString() === requesterId) || club.owner.toString() === requesterId;
  if (!isAdminOrOwner) throw new AppError("Not authorized", 403, "FORBIDDEN");
  club.joinRequests = club.joinRequests.filter(id => id.toString() !== targetUserId);
  await club.save();
  await Notification.create({ recipient: targetUserId, sender: requesterId, type: "club_rejected", club: club._id });
};

exports.leave = async (clubId, userId) => {
  const club = await Club.findById(clubId);
  if (!club) throw new AppError("Club not found", 404, "NOT_FOUND");
  if (club.owner.toString() === userId) throw new AppError("Owner cannot leave the club", 400, "OWNER_CANNOT_LEAVE");
  if (!club.members.some(m => m.toString() === userId)) throw new AppError("Not a member", 400, "NOT_MEMBER");
  club.members = club.members.filter(m => m.toString() !== userId);
  await club.save();
};

exports.createPost = async (clubId, authorId, content) => {
  const club = await Club.findById(clubId);
  if (!club) throw new AppError("Club not found", 404, "NOT_FOUND");
  if (!club.members.some(m => m.toString() === authorId)) throw new AppError("Members only", 403, "FORBIDDEN");
  const post = await Post.create({ content, author: authorId, club: clubId });
  return post.populate("author", "username profilePic");
};

exports.getPosts = async (clubId) => {
  return Post.find({ club: clubId }).populate("author", "username profilePic").sort({ createdAt: -1 }).lean();
};

exports.getNearby = async ({ lat, lng, radius = 25 }) => {
  const clubs = await Club.find({
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: radius * 1000
      }
    },
    "location.coordinates.0": { $ne: 0 }
  }).select("name description location locationName members").limit(20).lean();
  return clubs;
};

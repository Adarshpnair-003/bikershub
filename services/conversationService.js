const Conversation = require("../models/Conversation");
const AppError = require("../utils/AppError");

exports.createOrGet = async (userId, otherUserId) => {
  let conversation = await Conversation.findOne({
    type: "direct",
    participants: { $all: [userId, otherUserId], $size: 2 }
  }).populate("participants", "username profilePic");
  if (!conversation) {
    conversation = await Conversation.create({ type: "direct", participants: [userId, otherUserId] });
    await conversation.populate("participants", "username profilePic");
  }
  return conversation;
};

exports.list = async (userId) => {
  return Conversation.find({ participants: userId })
    .populate("participants", "username profilePic")
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();
};

exports.getById = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId)
    .populate("participants", "username profilePic")
    .lean();
  if (!conversation) throw new AppError("Conversation not found", 404, "NOT_FOUND");
  if (!conversation.participants.some(p => p._id.toString() === userId))
    throw new AppError("Access denied", 403, "FORBIDDEN");
  return conversation;
};

const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const AppError = require("../utils/AppError");
const mongoose = require("mongoose");

async function assertParticipant(conversationId, userId) {
  const convo = await Conversation.findById(conversationId).select("participants").lean();
  if (!convo) throw new AppError("Conversation not found", 404, "NOT_FOUND");
  if (!convo.participants.some(p => p.toString() === userId.toString()))
    throw new AppError("Access denied", 403, "FORBIDDEN");
}

exports.sendMessage = async ({ conversationId, text, type, senderId, io }) => {
  await assertParticipant(conversationId, senderId);
  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    text,
    type: type || "text",
    readBy: [senderId]
  });
  await Conversation.findByIdAndUpdate(conversationId, { lastMessage: text, lastMessageAt: new Date() });
  if (io) io.to(`conversation:${conversationId}`).emit("receiveMessage", message.toObject());
  return message;
};

exports.getMessages = async (conversationId, userId, { limit = 50, before } = {}) => {
  await assertParticipant(conversationId, userId);
  const safeLimit = Math.min(parseInt(limit) || 50, 100);
  const filter = { conversation: conversationId };
  if (before) {
    if (!mongoose.Types.ObjectId.isValid(before)) throw new AppError("Invalid cursor", 400, "INVALID_CURSOR");
    filter._id = { $lt: new mongoose.Types.ObjectId(before) };
  }
  const messages = await Message.find(filter)
    .populate("sender", "username profilePic")
    .sort({ _id: -1 })
    .limit(safeLimit)
    .lean();
  return messages.reverse();
};

exports.markRead = async (conversationId, userId) => {
  await assertParticipant(conversationId, userId);
  await Message.updateMany(
    { conversation: conversationId, readBy: { $ne: userId } },
    { $push: { readBy: userId } }
  );
};

exports.getUnreadCount = async (userId) => {
  const conversations = await Conversation.find({ participants: userId }, "_id").lean();
  return Message.countDocuments({
    conversation: { $in: conversations.map(c => c._id) },
    readBy: { $ne: userId }
  });
};

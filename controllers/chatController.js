const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const { getIO } = require("../socket/socket");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const apiResponse = require("../utils/apiResponse");

async function assertParticipant(conversationId, userId) {
  const convo = await Conversation.findById(conversationId).select("participants").lean();
  if (!convo) throw new AppError("Conversation not found", 404, "NOT_FOUND");
  const isParticipant = convo.participants.some(
    (p) => p.toString() === userId.toString()
  );
  if (!isParticipant) throw new AppError("Access denied", 403, "FORBIDDEN");
}

exports.sendMessage = catchAsync(async (req, res, next) => {
  const { conversationId, text, type } = req.body;
  await assertParticipant(conversationId, req.user.id);

  const message = await Message.create({
    conversation: conversationId,
    sender: req.user.id,
    text,
    type: type || "text",
    readBy: [req.user.id]
  });

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: text,
    lastMessageAt: new Date()
  });

  const io = getIO();
  io.to(`conversation:${conversationId}`).emit("receiveMessage", message);

  res.status(201).json(apiResponse.success(message, "Message sent"));
});

exports.getMessagesByConversation = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;
  await assertParticipant(conversationId, req.user.id);

  const messages = await Message.find({ conversation: conversationId })
    .populate("sender", "username")
    .sort({ createdAt: 1 })
    .lean();

  res.json(apiResponse.success(messages));
});

exports.markAsRead = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;
  await assertParticipant(conversationId, req.user.id);

  await Message.updateMany(
    { conversation: conversationId, readBy: { $ne: req.user.id } },
    { $push: { readBy: req.user.id } }
  );

  res.json(apiResponse.success(null, "Messages marked as read"));
});

exports.getUnreadCount = catchAsync(async (req, res, next) => {
  // Scope to conversations the user is part of — find their conversation IDs first
  const conversations = await Conversation.find(
    { participants: req.user.id },
    "_id"
  ).lean();
  const conversationIds = conversations.map((c) => c._id);

  const count = await Message.countDocuments({
    conversation: { $in: conversationIds },
    readBy: { $ne: req.user.id }
  });

  res.json(apiResponse.success({ unread: count }));
});

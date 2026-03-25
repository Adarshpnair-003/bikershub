const chatService = require("../services/chatService");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");

exports.sendMessage = catchAsync(async (req, res) => {
  const message = await chatService.sendMessage({ ...req.body, senderId: req.user.id, io: req.io });
  res.status(201).json(apiResponse.success(message, "Message sent"));
});

exports.getMessagesByConversation = catchAsync(async (req, res) => {
  const messages = await chatService.getMessages(req.params.conversationId, req.user.id, req.query);
  res.json(apiResponse.success(messages));
});

exports.markAsRead = catchAsync(async (req, res) => {
  await chatService.markRead(req.params.conversationId, req.user.id);
  res.json(apiResponse.success(null, "Messages marked as read"));
});

exports.getUnreadCount = catchAsync(async (req, res) => {
  const unread = await chatService.getUnreadCount(req.user.id);
  res.json(apiResponse.success({ unread }));
});

exports.editMessage = catchAsync(async (req, res) => {
  const message = await chatService.editMessage(req.params.messageId, req.user.id, req.body.text, req.io);
  res.json(apiResponse.success(message, "Message edited"));
});

exports.deleteMessage = catchAsync(async (req, res) => {
  const result = await chatService.deleteMessage(req.params.messageId, req.user.id, req.io);
  res.json(apiResponse.success(result, "Message deleted"));
});

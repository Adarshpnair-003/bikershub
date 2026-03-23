const conversationService = require("../services/conversationService");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");

exports.createOrGetConversation = catchAsync(async (req, res) => {
  const conversation = await conversationService.createOrGet(req.user.id, req.body.userId);
  res.json(apiResponse.success(conversation));
});

exports.getMyConversations = catchAsync(async (req, res) => {
  const conversations = await conversationService.list(req.user.id);
  res.json(apiResponse.success(conversations));
});

exports.getConversation = catchAsync(async (req, res) => {
  const conversation = await conversationService.getById(req.params.id, req.user.id);
  res.json(apiResponse.success(conversation));
});

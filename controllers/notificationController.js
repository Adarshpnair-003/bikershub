const notificationService = require("../services/notificationService");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");

exports.getNotifications = catchAsync(async (req, res) => {
  const result = await notificationService.getAll(req.user.id, req.query);
  res.json(apiResponse.paginated(result.notifications, result.pagination));
});

exports.getUnreadCount = catchAsync(async (req, res) => {
  const unread = await notificationService.getUnreadCount(req.user.id);
  res.json(apiResponse.success({ unread }));
});

exports.markAsRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markRead(req.params.id, req.user.id);
  res.json(apiResponse.success(notification));
});

exports.markAllRead = catchAsync(async (req, res) => {
  await notificationService.markAllRead(req.user.id);
  res.json(apiResponse.success(null, "All notifications marked as read"));
});

exports.deleteNotification = catchAsync(async (req, res) => {
  await notificationService.delete(req.params.id, req.user.id);
  res.json(apiResponse.success(null, "Notification deleted"));
});

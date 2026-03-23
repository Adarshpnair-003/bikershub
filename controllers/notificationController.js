const Notification = require("../models/Notification");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const apiResponse = require("../utils/apiResponse");

exports.getNotifications = catchAsync(async (req, res) => {
  const notifications = await Notification.find({
    recipient: req.user.id
  })
  .populate("sender", "username profilePicture")
  .sort({ createdAt: -1 });

  res.json(apiResponse.success(notifications));
});


exports.markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification)
    return next(new AppError("Notification not found", 404, "NOT_FOUND"));

  if (notification.recipient.toString() !== req.user.id) {
    return next(new AppError("Not authorized", 403, "FORBIDDEN"));
  }

  notification.isRead = true;
  await notification.save();

  res.json(apiResponse.success(notification));
});


exports.markAllRead = catchAsync(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user.id },
    { isRead: true }
  );

  res.json(apiResponse.success(null, "All notifications marked as read"));
});


exports.deleteNotification = catchAsync(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification)
    return next(new AppError("Notification not found", 404, "NOT_FOUND"));

  if (notification.recipient.toString() !== req.user.id)
    return next(new AppError("Not authorized", 403, "FORBIDDEN"));

  await notification.deleteOne();

  res.json(apiResponse.success(null, "Notification deleted successfully"));
});


exports.getUnreadCount = catchAsync(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user.id,
    isRead: false
  });

  res.json(apiResponse.success({ unread: count }));
});

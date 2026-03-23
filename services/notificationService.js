const Notification = require("../models/Notification");
const AppError = require("../utils/AppError");

exports.getAll = async (userId, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    Notification.find({ recipient: userId })
      .populate("sender", "username profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipient: userId })
  ]);
  return { notifications, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

exports.getUnreadCount = async (userId) => {
  return Notification.countDocuments({ recipient: userId, isRead: false });
};

exports.markRead = async (notificationId, userId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new AppError("Notification not found", 404, "NOT_FOUND");
  if (notification.recipient.toString() !== userId) throw new AppError("Not authorized", 403, "FORBIDDEN");
  notification.isRead = true;
  await notification.save();
  return notification;
};

exports.markAllRead = async (userId) => {
  await Notification.updateMany({ recipient: userId }, { isRead: true });
};

exports.delete = async (notificationId, userId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new AppError("Notification not found", 404, "NOT_FOUND");
  if (notification.recipient.toString() !== userId) throw new AppError("Not authorized", 403, "FORBIDDEN");
  await notification.deleteOne();
};

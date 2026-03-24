const Notification = require("../models/Notification");

exports.getNotifications = async (req, res) => {
  try {

    const notifications = await Notification.find({
      recipient: req.user.id
    })
    .populate("sender", "username profilePicture")
    .sort({ createdAt: -1 });

    res.json({ success: true, data: notifications });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.markAsRead = async (req, res) => {
  try {

    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    res.json({ success: true, data: notification, message: "Marked as read" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.markAllRead = async (req, res) => {
  try {

    await Notification.updateMany(
      { recipient: req.user.id },
      { isRead: true }
    );

    res.json({ success: true, message: "All notifications marked as read" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.deleteNotification = async (req, res) => {

  try {

    const notification = await Notification.findById(req.params.id);

    if (!notification)
      return res.status(404).json({ message: "Notification not found" });

    if (notification.recipient.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    await notification.deleteOne();

    res.json({ message: "Notification deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};

exports.getUnreadCount = async (req, res) => {
  try {

    const count = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });

    res.json({ success: true, data: { count } });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
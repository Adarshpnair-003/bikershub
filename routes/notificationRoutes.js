const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

router.get("/", protect, notificationController.getNotifications);

router.get("/unread-count", protect, notificationController.getUnreadCount);

router.put("/:id/read", protect, notificationController.markAsRead);

router.put("/read-all", protect, notificationController.markAllRead);

router.delete("/:id", protect, notificationController.deleteNotification);

module.exports = router;

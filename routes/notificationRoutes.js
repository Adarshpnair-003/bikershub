const express = require("express");
const router = express.Router();
const { param } = require("express-validator");

const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

router.get("/", authMiddleware, notificationController.getNotifications);

router.get("/unread-count", authMiddleware, notificationController.getUnreadCount);

router.put(
	"/:id/read",
	authMiddleware,
	[param("id").isMongoId().withMessage("Valid notification id is required")],
	validateRequest,
	notificationController.markAsRead
);

router.put("/read-all", authMiddleware, notificationController.markAllRead);

router.delete(
	"/:id",
	authMiddleware,
	[param("id").isMongoId().withMessage("Valid notification id is required")],
	validateRequest,
	notificationController.deleteNotification
);

module.exports = router;
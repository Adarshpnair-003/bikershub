const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");

const protect = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const chatCtrl = require("../controllers/chatController");

/* SEND MESSAGE */
router.post(
	"/send",
	protect,
	[
		body("conversationId")
			.isMongoId()
			.withMessage("Valid conversation id is required"),
		body("text").trim().notEmpty().withMessage("Message text is required")
	],
	validateRequest,
	chatCtrl.sendMessage
);

/* GET MESSAGES OF A CONVERSATION */
router.get(
	"/conversation/:conversationId",
	protect,
	[
		param("conversationId")
			.isMongoId()
			.withMessage("Valid conversation id is required")
	],
	validateRequest,
	chatCtrl.getMessagesByConversation
);

/* MARK MESSAGES AS READ */
router.put(
	"/read/:conversationId",
	protect,
	[
		param("conversationId")
			.isMongoId()
			.withMessage("Valid conversation id is required")
	],
	validateRequest,
	chatCtrl.markAsRead
);

/* GET UNREAD MESSAGE COUNT */
router.get("/unread", protect, chatCtrl.getUnreadCount);

module.exports = router;
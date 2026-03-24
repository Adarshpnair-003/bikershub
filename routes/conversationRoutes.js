const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");

const protect = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const conversationController = require("../controllers/conversationController");

/* CREATE OR GET CONVERSATION */
router.post(
	"/",
	protect,
	[body("userId").isMongoId().withMessage("Valid user id is required")],
	validateRequest,
	conversationController.createOrGetConversation
);

/* GET USER CONVERSATIONS */
router.get("/", protect, conversationController.getMyConversations);

/* GET SINGLE CONVERSATION */
router.get(
	"/:id",
	protect,
	[param("id").isMongoId().withMessage("Valid conversation id is required")],
	validateRequest,
	conversationController.getConversation
);

module.exports = router;
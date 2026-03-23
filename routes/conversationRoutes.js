const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const conversationController = require("../controllers/conversationController");

/* CREATE OR GET CONVERSATION */
router.post("/", protect, conversationController.createOrGetConversation);

/* GET USER CONVERSATIONS */
router.get("/", protect, conversationController.getMyConversations);

/* GET SINGLE CONVERSATION */
router.get("/:id", protect, conversationController.getConversation);

module.exports = router;
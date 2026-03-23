const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const chatCtrl = require("../controllers/chatController");

/* SEND MESSAGE */
router.post("/send", protect, chatCtrl.sendMessage);

/* GET MESSAGES OF A CONVERSATION */
router.get("/conversation/:conversationId", protect, chatCtrl.getMessagesByConversation);

/* MARK MESSAGES AS READ */
router.put("/read/:conversationId", protect, chatCtrl.markAsRead);

/* GET UNREAD MESSAGE COUNT */
router.get("/unread", protect, chatCtrl.getUnreadCount);

module.exports = router;
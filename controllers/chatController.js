const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const { getIO } = require("../socket/socket");

/* SEND MESSAGE */
exports.sendMessage = async (req, res) => {
  try {

    const { conversationId, text, type } = req.body;

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user.id,
      text,
      type: type || "text",
      readBy: [req.user.id]
    });

    /* update last message in conversation */
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text,
      lastMessageAt: new Date()
    });

    /* SOCKET REALTIME EMIT */
    const io = getIO();

    io.to(conversationId).emit("receiveMessage", message);

    res.status(201).json({ success: true, data: message });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* GET MESSAGES FOR A CONVERSATION */
exports.getMessagesByConversation = async (req, res) => {
  try {

    const messages = await Message.find({
      conversation: req.params.conversationId
    })
      .populate("sender", "username")
      .sort({ createdAt: 1 });

    res.json({ success: true, data: messages });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* MARK MESSAGES AS READ */
exports.markAsRead = async (req, res) => {
  try {

    await Message.updateMany(
      {
        conversation: req.params.conversationId,
        readBy: { $ne: req.user.id }
      },
      {
        $push: { readBy: req.user.id }
      }
    );

    res.json({ message: "Messages marked as read" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* UNREAD COUNT */
exports.getUnreadCount = async (req, res) => {
  try {

    const count = await Message.countDocuments({
      readBy: { $ne: req.user.id }
    });

    res.json({ success: true, data: { count } });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
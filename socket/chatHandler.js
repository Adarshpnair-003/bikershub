const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

module.exports = function registerChatHandlers(socket, io) {
  /* ============================
     CONVERSATION (DM CHAT)
  ============================ */
  socket.on("joinConversation", (conversationId) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on("sendMessage", async (data) => {
    try {
      const { conversationId, text, type } = data;
      if (!conversationId || !text) return;

      // Authorization: verify sender is a participant
      const convo = await Conversation.findById(conversationId).select("participants").lean();
      if (!convo) return;
      const isParticipant = convo.participants.some(
        (p) => p.toString() === socket.user.id.toString()
      );
      if (!isParticipant) return; // silently ignore (socket context, not HTTP)

      const message = await Message.create({
        conversation: conversationId,
        sender: socket.user.id,
        text,
        type: type || "text",
        readBy: [socket.user.id]
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: text,
        lastMessageAt: new Date()
      });

      io.to(`conversation:${conversationId}`).emit("receiveMessage", message.toObject());
    } catch (err) {
      console.error("[socket] sendMessage error:", err.message);
    }
  });

  socket.on("typing", (data) => {
    socket.to(`conversation:${data.conversationId}`).emit("typing", {
      senderId: socket.user.id
    });
  });

  socket.on("stopTyping", (data) => {
    socket.to(`conversation:${data.conversationId}`).emit("stopTyping", {
      senderId: socket.user.id
    });
  });

  /* ============================
     CLUB CHAT
  ============================ */
  socket.on("joinClubChat", ({ clubId }) => {
    socket.join(`club:${clubId}`);
  });

  socket.on("sendClubMessage", async (data) => {
    try {
      const { clubId, text, type } = data;
      if (!clubId || !text) return;

      // Find the club's conversation
      const convo = await Conversation.findOne({ type: "club", club: clubId });
      if (!convo) return;

      // Authorization: verify sender is a participant
      const isParticipant = convo.participants.some(
        (p) => p.toString() === socket.user.id.toString()
      );
      if (!isParticipant) return; // silently ignore (socket context, not HTTP)

      const message = await Message.create({
        conversation: convo._id,
        sender: socket.user.id,
        text,
        type: type || "text",
        readBy: [socket.user.id]
      });

      await Conversation.findByIdAndUpdate(convo._id, {
        lastMessage: text,
        lastMessageAt: new Date()
      });

      io.to(`club:${clubId}`).emit("receiveClubMessage", message.toObject());
    } catch (err) {
      console.error("[socket] sendClubMessage error:", err.message);
    }
  });

  /* ============================
     RIDE CHAT
     NOTE: Uses ride:{rideId} room (same as ride tracking) for consistency
  ============================ */
  socket.on("joinRideChat", ({ rideId }) => {
    socket.join(`ride:${rideId}`);
  });

  socket.on("sendRideMessage", async (data) => {
    try {
      const { rideId, text, type } = data;
      if (!rideId || !text) return;

      // Find the ride's conversation
      const convo = await Conversation.findOne({ type: "ride", ride: rideId });
      if (!convo) return;

      // Authorization: verify sender is a participant
      const isParticipant = convo.participants.some(
        (p) => p.toString() === socket.user.id.toString()
      );
      if (!isParticipant) return; // silently ignore (socket context, not HTTP)

      const message = await Message.create({
        conversation: convo._id,
        sender: socket.user.id,
        text,
        type: type || "text",
        readBy: [socket.user.id]
      });

      await Conversation.findByIdAndUpdate(convo._id, {
        lastMessage: text,
        lastMessageAt: new Date()
      });

      io.to(`ride:${rideId}`).emit("receiveRideMessage", message.toObject());
    } catch (err) {
      console.error("[socket] sendRideMessage error:", err.message);
    }
  });
};

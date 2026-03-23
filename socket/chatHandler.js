const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Club = require("../models/Club");

module.exports = function registerChatHandlers(socket, io) {
  /* ============================
     CONVERSATION (DM CHAT)
  ============================ */
  socket.on("joinConversation", async (conversationId) => {
    try {
      const convo = await Conversation.findById(conversationId).select("participants").lean();
      if (!convo) return;
      if (!convo.participants.some(p => p.toString() === socket.user.id.toString())) return;
      socket.join(`conversation:${conversationId}`);
    } catch (err) {
      console.error("[socket] joinConversation error:", err.message);
    }
  });

  socket.on("sendMessage", async (data) => {
    try {
      const { conversationId, text, type } = data;
      if (!conversationId || !text) return;

      const convo = await Conversation.findById(conversationId).select("participants").lean();
      if (!convo) return;
      if (!convo.participants.some(p => p.toString() === socket.user.id.toString())) return;

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
  socket.on("joinClubChat", async ({ clubId }) => {
    try {
      const club = await Club.findById(clubId).select("members").lean();
      if (!club) return;
      if (!club.members.some(m => m.toString() === socket.user.id.toString())) return;
      socket.join(`club:${clubId}`);
    } catch (err) {
      console.error("[socket] joinClubChat error:", err.message);
    }
  });

  socket.on("sendClubMessage", async (data) => {
    try {
      const { clubId, text, type } = data;
      if (!clubId || !text) return;

      const convo = await Conversation.findOne({ type: "club", club: clubId });
      if (!convo) return;
      if (!convo.participants.some(p => p.toString() === socket.user.id.toString())) return;

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
  socket.on("joinRideChat", async ({ rideId }) => {
    try {
      const convo = await Conversation.findOne({ type: "ride", ride: rideId }).select("participants").lean();
      if (!convo) return;
      if (!convo.participants.some(p => p.toString() === socket.user.id.toString())) return;
      socket.join(`ride:${rideId}`);
    } catch (err) {
      console.error("[socket] joinRideChat error:", err.message);
    }
  });

  socket.on("sendRideMessage", async (data) => {
    try {
      const { rideId, text, type } = data;
      if (!rideId || !text) return;

      const convo = await Conversation.findOne({ type: "ride", ride: rideId });
      if (!convo) return;
      if (!convo.participants.some(p => p.toString() === socket.user.id.toString())) return;

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

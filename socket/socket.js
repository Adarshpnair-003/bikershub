const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Ride = require("../models/Ride");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const haversineDistance = require("../utils/distance");
const env = require("../config/env");

let io;

const initSocket = (server) => {
  const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST"]
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token ||
                    socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.user = { id: decoded.id };
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    /* ============================
       CONVERSATION (DM CHAT)
    ============================ */
    socket.on("joinConversation", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log("Joined conversation:", conversationId);
    });

    socket.on("sendMessage", async (data) => {
      try {
        const { conversationId, text, type } = data;
        if (!conversationId || !text) return;

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

        io.to(`conversation:${conversationId}`).emit("receiveMessage", message);
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
       RIDE TRACKING (LIVE GPS)
    ============================ */

    // Join ride tracking room
    socket.on("joinRide", ({ rideId }) => {
      socket.join(`ride:${rideId}`);
      console.log("Joined ride:", rideId);
    });

    // Leave ride tracking room
    socket.on("leaveRide", ({ rideId }) => {
      socket.leave(`ride:${rideId}`);
    });

    // Live GPS updates
    socket.on("rideLocationUpdate", async (data) => {
      try {
        const { rideId, lat, lng } = data;
        const userId = socket.user.id;

        // ✅ Validation
        if (!rideId || lat == null || lng == null) return;

        const ride = await Ride.findById(rideId);
        if (!ride) return;

        /* ---------------------------
           ROUTE (Polyline)
        ---------------------------- */
        if (!ride.route) {
          ride.route = {
            type: "LineString",
            coordinates: []
          };
        }

        ride.route.coordinates.push([lng, lat]);

        /* ---------------------------
           DISTANCE CALCULATION
        ---------------------------- */
        const coords = ride.route.coordinates;

        if (coords.length > 1) {
          const prev = coords[coords.length - 2];
          const curr = coords[coords.length - 1];

          const dist = haversineDistance(
            { lat: prev[1], lng: prev[0] },
            { lat: curr[1], lng: curr[0] }
          );

          ride.totalDistance = Number(
            (ride.totalDistance + dist).toFixed(3)
          );
        }

        /* ---------------------------
           RIDER LIVE LOCATION
        ---------------------------- */
        const existing = ride.riderLocations.find(
          r => r.user.toString() === userId
        );

        if (existing) {
          existing.location.coordinates = [lng, lat];
          existing.updatedAt = new Date();
        } else {
          ride.riderLocations.push({
            user: userId,
            location: {
              type: "Point",
              coordinates: [lng, lat]
            },
            updatedAt: new Date()
          });
        }

        await ride.save();

        /* ---------------------------
           BROADCAST UPDATE
        ---------------------------- */
        io.to(`ride:${rideId}`).emit("riderLocationUpdated", {
          userId,
          lat,
          lng,
          totalDistance: ride.totalDistance
        });

      } catch (error) {
        console.error("Ride tracking error:", error);
      }
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

        const message = await Message.create({
          conversation: convo._id,
          sender: socket.user.id,
          text,
          type: type || "text",
          readBy: [socket.user.id]
        });

        io.to(`club:${clubId}`).emit("receiveClubMessage", message);
      } catch (err) {
        console.error("[socket] sendClubMessage error:", err.message);
      }
    });

    /* ============================
       RIDE CHAT
    ============================ */
    socket.on("joinRideChat", ({ rideId }) => {
      socket.join(`rideChat:${rideId}`);
    });

    socket.on("sendRideMessage", async (data) => {
      try {
        const { rideId, text, type } = data;
        if (!rideId || !text) return;

        // Find the ride's conversation
        const convo = await Conversation.findOne({ type: "ride", ride: rideId });
        if (!convo) return;

        const message = await Message.create({
          conversation: convo._id,
          sender: socket.user.id,
          text,
          type: type || "text",
          readBy: [socket.user.id]
        });

        io.to(`rideChat:${rideId}`).emit("receiveRideMessage", message);
      } catch (err) {
        console.error("[socket] sendRideMessage error:", err.message);
      }
    });

    /* ============================
       POST COMMENTS (REALTIME)
    ============================ */
    socket.on("joinPost", (postId) => {
      socket.join(`post:${postId}`);
      console.log("Joined post:", postId);
    });

    /* ============================
       DISCONNECT
    ============================ */
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });

  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = { initSocket, getIO };
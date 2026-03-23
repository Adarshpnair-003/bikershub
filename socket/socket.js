const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

const registerChatHandlers = require("./chatHandler");
const registerRideHandlers = require("./rideHandler");
const registerNotificationHandlers = require("./notificationHandler");
const registerPostHandlers = require("./postHandler");

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

  // Redis adapter for horizontal scaling (uses ioredis)
  if (env.REDIS_URL) {
    try {
      const { createAdapter } = require("@socket.io/redis-adapter");
      const Redis = require("ioredis");
      const pubClient = new Redis(env.REDIS_URL);
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      console.log("[socket] Redis adapter connected");
    } catch (err) {
      console.error("[socket] Redis adapter error:", err.message);
    }
  }

  // JWT auth middleware — reject unauthenticated connections
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];
      if (!token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.user = { id: decoded.id };
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    // Automatically join personal notification room on connect
    socket.join(`user:${socket.user.id}`);

    registerChatHandlers(socket, io);
    registerRideHandlers(socket, io);
    registerNotificationHandlers(socket, io);
    registerPostHandlers(socket, io);

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};

module.exports = { initSocket, getIO };

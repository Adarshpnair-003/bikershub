const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const logger = require("../config/logger");

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
      logger.info("[socket] Redis adapter connected");
    } catch (err) {
      logger.error({ err: err.message }, "[socket] Redis adapter error");
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
      socket.user = { id: decoded.id, tokenExp: decoded.exp };
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    // Automatically join personal notification room on connect
    socket.join(`user:${socket.user.id}`);

    // Disconnect socket when JWT expires — prevents long-lived stale connections
    if (socket.user.tokenExp) {
      const msUntilExpiry = socket.user.tokenExp * 1000 - Date.now();
      if (msUntilExpiry > 0) {
        setTimeout(() => socket.disconnect(true), msUntilExpiry);
      } else {
        socket.disconnect(true);
        return;
      }
    }

    registerChatHandlers(socket, io);
    registerRideHandlers(socket, io);
    registerNotificationHandlers(socket, io);
    registerPostHandlers(socket, io);

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "[socket] User disconnected");
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};

module.exports = { initSocket, getIO };

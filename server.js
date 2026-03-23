require("dotenv").config(); // MUST be first line
const env = require("./config/env");

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");

const connectDB = require("./config/db");
const { initSocket } = require("./socket/socket");
const errorHandler = require("./middleware/errorHandler");
const { globalLimiter } = require("./middleware/rateLimiter");

/* CONNECT DATABASE */
connectDB();

const app = express();

/* SECURITY HEADERS */
app.use(helmet());

/* CORS — only allow whitelisted origins */
const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin requests (no origin header) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

/* REQUEST BODY PARSERS */
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

/* NOSQL INJECTION SANITIZATION */
app.use(mongoSanitize());

/* REQUEST LOGGING (dev only) */
if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

/* RATE LIMITING */
app.use(globalLimiter);

/* CREATE HTTP SERVER */
const server = http.createServer(app);

/* INITIALIZE SOCKET */
const io = initSocket(server);

/* MAKE SOCKET AVAILABLE IN CONTROLLERS */
app.use((req, res, next) => {
  req.io = io;
  next();
});

/* ROUTES */
app.use("/api", require("./routes/index"));

/* HEALTH CHECK */
app.get("/", (req, res) => {
  res.json({ success: true, message: "Bikers Hub API is running" });
});

/* 404 HANDLER */
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } });
});

/* CENTRALIZED ERROR HANDLER (must be last) */
app.use(errorHandler);

/* START SERVER */
const PORT = env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`[server] Running on port ${PORT} in ${env.NODE_ENV} mode`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[server] Port ${PORT} is already in use`);
    process.exit(1);
  }
  throw err;
});

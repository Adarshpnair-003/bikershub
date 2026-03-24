const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const connectDB = require("./config/db");
const { initSocket } = require("./socket/socket");

/* CONNECT DATABASE */
connectDB();

const app = express();

/* MIDDLEWARES */
app.use(express.json());
app.use(cors());

/* CREATE HTTP SERVER */
const server = http.createServer(app);

/* INITIALIZE SOCKET */
const io = initSocket(server);

/* MAKE SOCKET AVAILABLE IN CONTROLLERS */
app.use((req, res, next) => {
  req.io = io;
  next();
});

console.log("Routes initialized");

/* ROUTES */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/comments", require("./routes/commentRoutes"));
app.use("/api/clubs", require("./routes/clubRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/rides", require("./routes/rideRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/conversations", require("./routes/conversationRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));

/* FRONTEND STATIC (OPTIONAL) */
const frontendDistPath = path.join(__dirname, "frontend", "dist");
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get(/^\/(?!api|$).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

/* HEALTH CHECK */
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

/* 404 HANDLER (IMPORTANT) */
app.use((req, res) => {
  res.status(404).json({ msg: "Route not found" });
});

/* GLOBAL ERROR HANDLER (VERY IMPORTANT) */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: "Server error" });
});

app.use((err, req, res, next) => {
  if (err.message === "Only images and videos allowed") {
    return res.status(400).json({ msg: err.message });
  }
  next(err);
});

/* START SERVER */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
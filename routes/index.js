const express = require("express");
const router = express.Router();

router.use("/auth", require("./authRoutes"));
router.use("/users", require("./userRoutes"));
router.use("/posts", require("./postRoutes"));
router.use("/comments", require("./commentRoutes"));
router.use("/clubs", require("./clubRoutes"));
router.use("/rides", require("./rideRoutes"));
router.use("/notifications", require("./notificationRoutes"));
router.use("/chat", require("./chatRoutes"));
router.use("/conversations", require("./conversationRoutes"));
router.use("/search", require("./searchRoutes"));
router.use("/upload", require("./uploadRoutes"));
router.use("/weather", require("./weatherRoutes"));

module.exports = router;

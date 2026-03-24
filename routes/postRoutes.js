const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const postController = require("../controllers/postController");
const upload = require("../middleware/upload");

router.post(
  "/create",
  protect,
  upload.array("media", 5),
  postController.createPost
);
/* CREATE POST */
router.post("/", protect, postController.createPost);

/* GLOBAL FEED */
router.get("/", protect, postController.getAllPosts);

/* SMART FEED */
router.get("/feed", protect, postController.getSmartFeed);

/* LIKE POST */
router.put("/like/:id", protect, postController.likePost);

router.delete(
  "/:id",
  protect,
  postController.deletePost
);

router.put(
  "/:id",
  protect,
  upload.array("media", 5),
  postController.updatePost
);

module.exports = router;
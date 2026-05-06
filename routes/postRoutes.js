const express = require("express");
const router = express.Router();
const { param } = require("express-validator");

const protect = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const postController = require("../controllers/postController");
const upload = require("../middleware/upload");

/* CREATE POST */
router.post(
  "/",
  protect,
  upload.array("media", 5),
  postController.createPost
);

/* GLOBAL FEED */
router.get("/", protect, postController.getAllPosts);

/* SMART FEED */
router.get("/feed", protect, postController.getSmartFeed);

/* GET SINGLE POST */
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Valid post id is required")],
  validateRequest,
  postController.getPostById
);

/* LIKE POST */
router.put(
  "/like/:id",
  protect,
  [param("id").isMongoId().withMessage("Valid post id is required")],
  validateRequest,
  postController.likePost
);

/* VOTE ON POLL */
router.post(
  "/:id/poll/vote",
  protect,
  [param("id").isMongoId().withMessage("Valid post id is required")],
  validateRequest,
  postController.voteOnPoll
);

/* CLOSE POLL (author only) */
router.put(
  "/:id/poll/close",
  protect,
  [param("id").isMongoId().withMessage("Valid post id is required")],
  validateRequest,
  postController.closePoll
);

router.delete(
  "/:id",
  protect,
  [param("id").isMongoId().withMessage("Valid post id is required")],
  validateRequest,
  postController.deletePost
);

router.put(
  "/:id",
  protect,
  [param("id").isMongoId().withMessage("Valid post id is required")],
  validateRequest,
  upload.array("media", 5),
  postController.updatePost
);

module.exports = router;
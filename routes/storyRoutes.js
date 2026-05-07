const express = require("express");
const router = express.Router();
const { param } = require("express-validator");

const protect = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const upload = require("../middleware/upload");
const storyController = require("../controllers/storyController");

router.post("/", protect, upload.single("media"), storyController.createStory);
router.get("/", protect, storyController.getFeed);

router.get(
  "/user/:userId",
  protect,
  [param("userId").isMongoId().withMessage("Valid user id is required")],
  validateRequest,
  storyController.getUserStories
);

router.post(
  "/:id/view",
  protect,
  [param("id").isMongoId().withMessage("Valid story id is required")],
  validateRequest,
  storyController.markViewed
);

router.delete(
  "/:id",
  protect,
  [param("id").isMongoId().withMessage("Valid story id is required")],
  validateRequest,
  storyController.deleteStory
);

module.exports = router;

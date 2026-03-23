const express = require("express");
const router = express.Router();
const { protect, optionalAuth } = require("../middleware/auth");

const userController = require("../controllers/userController");

/* GET CURRENT USER */
router.get("/me", protect, userController.getCurrentUser);

/* UPDATE CURRENT USER PROFILE */
router.put("/me", protect, userController.updateProfile);

/* GET USER PROFILE (optionalAuth for isFollowing check) */
router.get("/:id", optionalAuth, userController.getUserProfile);

/* FOLLOW USER */
router.put("/follow/:id", protect, userController.followUser);

/* UNFOLLOW USER */
router.put("/unfollow/:id", protect, userController.unfollowUser);

module.exports = router;
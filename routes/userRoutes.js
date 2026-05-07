const express = require("express");
const router = express.Router();
const { param } = require("express-validator");
const protect = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const userController = require("../controllers/userController");

/* GET CURRENT USER */
router.get("/me", protect, userController.getCurrentUser);

/* UPDATE PROFILE */
router.put("/me", protect, userController.updateProfile);

/* GET USER PROFILE */
router.get(
	"/:id",
	protect,
	[param("id").isMongoId().withMessage("Valid user id is required")],
	validateRequest,
	userController.getUserProfile
);

/* FOLLOW USER */
router.put(
	"/follow/:id",
	protect,
	[param("id").isMongoId().withMessage("Valid user id is required")],
	validateRequest,
	userController.followUser
);

/* UNFOLLOW USER */
router.put(
	"/unfollow/:id",
	protect,
	[param("id").isMongoId().withMessage("Valid user id is required")],
	validateRequest,
	userController.unfollowUser
);

/* GET USER ACHIEVEMENTS */
router.get(
	"/:id/achievements",
	[param("id").isMongoId().withMessage("Valid user id is required")],
	validateRequest,
	async (req, res) => {
		try {
			const achievementService = require("../services/achievementService");
			const list = await achievementService.listForUser(req.params.id);
			res.json({ success: true, data: list });
		} catch (err) {
			res.status(500).json({ success: false, error: { message: err.message } });
		}
	}
);

module.exports = router;
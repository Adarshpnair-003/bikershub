const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const protect = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const clubController = require("../controllers/clubController");

/* LIST ALL CLUBS */
router.get("/", clubController.getAllClubs);

router.post(
	"/",
	protect,
	[
		body("name").trim().notEmpty().withMessage("Club name is required"),
		body("description").trim().notEmpty().withMessage("Description is required"),
		body("location").trim().notEmpty().withMessage("Location is required"),
		body("isPrivate").optional().isBoolean().withMessage("isPrivate must be boolean")
	],
	validateRequest,
	clubController.createClub
);

router.post(
	"/:id/join",
	protect,
	[param("id").isMongoId().withMessage("Valid club id is required")],
	validateRequest,
	clubController.requestJoinClub
);

router.get(
	"/:id/requests",
	protect,
	[param("id").isMongoId().withMessage("Valid club id is required")],
	validateRequest,
	clubController.getJoinRequests
);

router.put(
	"/approve/:clubId/:userId",
	protect,
	[
		param("clubId").isMongoId().withMessage("Valid club id is required"),
		param("userId").isMongoId().withMessage("Valid user id is required")
	],
	validateRequest,
	clubController.approveRequest
);

router.put(
	"/reject/:clubId/:userId",
	protect,
	[
		param("clubId").isMongoId().withMessage("Valid club id is required"),
		param("userId").isMongoId().withMessage("Valid user id is required")
	],
	validateRequest,
	clubController.rejectRequest
);

router.put(
	"/leave/:clubId",
	protect,
	[param("clubId").isMongoId().withMessage("Valid club id is required")],
	validateRequest,
	clubController.leaveClub
);

router.post(
	"/:clubId/post",
	protect,
	[
		param("clubId").isMongoId().withMessage("Valid club id is required"),
		body("content").trim().notEmpty().withMessage("Post content is required")
	],
	validateRequest,
	clubController.createClubPost
);

router.get(
	"/:clubId/posts",
	[param("clubId").isMongoId().withMessage("Valid club id is required")],
	validateRequest,
	clubController.getClubPosts
);

router.get(
	"/:clubId",
	[param("clubId").isMongoId().withMessage("Valid club id is required")],
	validateRequest,
	clubController.getClubDetails
);

module.exports = router;
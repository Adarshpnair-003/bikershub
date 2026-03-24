const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const protect = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const commentController = require("../controllers/commentController");

/* CREATE COMMENT */
router.post(
	"/:postId",
	protect,
	[
		param("postId").isMongoId().withMessage("Valid post id is required"),
		body("content").trim().notEmpty().withMessage("Comment content is required"),
		body("parentComment")
			.optional()
			.isMongoId()
			.withMessage("parentComment must be a valid id")
	],
	validateRequest,
	commentController.createComment
);

/* GET COMMENTS */
router.get(
	"/:postId",
	[param("postId").isMongoId().withMessage("Valid post id is required")],
	validateRequest,
	commentController.getComments
);

/* LIKE COMMENT */
router.put(
	"/like/:commentId",
	protect,
	[param("commentId").isMongoId().withMessage("Valid comment id is required")],
	validateRequest,
	commentController.likeComment
);

/* DELETE COMMENT */
router.delete(
	"/:commentId",
	protect,
	[param("commentId").isMongoId().withMessage("Valid comment id is required")],
	validateRequest,
	commentController.deleteComment
);

module.exports = router;
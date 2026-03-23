const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");

const commentController = require("../controllers/commentController");

/* CREATE COMMENT */
router.post("/:postId", protect, commentController.createComment);

/* GET COMMENTS */
router.get("/:postId", commentController.getComments);

/* LIKE COMMENT */
router.put("/like/:commentId", protect, commentController.likeComment);

/* DELETE COMMENT */
router.delete("/:commentId", protect, commentController.deleteComment);

module.exports = router;
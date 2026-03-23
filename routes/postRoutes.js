const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const postController = require("../controllers/postController");
const upload = require("../middleware/upload");
const validate = require("../middleware/validate");
const { createPostSchema, updatePostSchema } = require("../validators/postValidator");

/* GLOBAL FEED */
router.get("/", postController.getAllPosts);

/* SMART FEED */
router.get("/feed", protect, postController.getSmartFeed);

/* CREATE POST */
router.post("/", protect, upload.array("media", 5), validate(createPostSchema), postController.createPost);

/* LIKE POST */
router.put("/like/:id", protect, postController.likePost);

/* SINGLE POST */
router.get("/:id", postController.getPost);

/* UPDATE / DELETE */
router.put("/:id", protect, upload.array("media", 5), validate(updatePostSchema), postController.updatePost);
router.delete("/:id", protect, postController.deletePost);

module.exports = router;

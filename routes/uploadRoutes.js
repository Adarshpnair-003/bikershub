const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const upload = require("../middleware/upload");
const uploadController = require("../controllers/uploadController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

router.post(
  "/",
  authMiddleware,
  upload.single("file"),
  uploadController.uploadFile
);
// ✅ NEW (multiple upload)
router.post(
  "/multiple",
  authMiddleware,
  upload.array("media", 5),
  uploadController.uploadMultipleFiles
);

router.post(
  "/profile",
  authMiddleware,
  upload.single("file"),
  uploadController.uploadProfilePic
);

router.delete(
  "/",
  authMiddleware,
  [
    body("public_id").trim().notEmpty().withMessage("public_id is required"),
    body("type")
      .optional()
      .isIn(["image", "video", "raw", "auto"])
      .withMessage("Invalid resource type")
  ],
  validateRequest,
  uploadController.deleteFile
);

module.exports = router;
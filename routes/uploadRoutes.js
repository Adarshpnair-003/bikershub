const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const uploadController = require("../controllers/uploadController");
const { protect } = require("../middleware/auth");

router.post("/", protect, upload.single("file"), uploadController.uploadFile);

// Upload multiple files
router.post(
  "/multiple",
  protect,
  upload.array("media", 5),
  uploadController.uploadMultipleFiles
);

router.post(
  "/profile",
  protect,
  upload.single("file"),
  uploadController.uploadProfilePic
);

router.delete("/", protect, uploadController.deleteFile);

module.exports = router;

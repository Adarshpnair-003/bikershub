const express = require("express");
const router = express.Router();

const { protect, optionalAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const validate = require("../middleware/validate");
const { uploadLimiter } = require("../middleware/rateLimiter");

const bikeController = require("../controllers/bikeController");
const { createBikeSchema, updateBikeSchema } = require("../validators/bikeValidator");

/* CREATE BIKE (multipart) — multer must run before validate so req.body is populated */
router.post(
  "/",
  uploadLimiter,
  protect,
  upload.single("photo"),
  validate(createBikeSchema),
  bikeController.create
);

/* LIST GARAGE FOR A USER */
router.get("/user/:userId", optionalAuth, bikeController.listByUser);

/* SINGLE BIKE */
router.get("/:id", optionalAuth, bikeController.getById);

/* UPDATE BIKE (multipart) */
router.put(
  "/:id",
  uploadLimiter,
  protect,
  upload.single("photo"),
  validate(updateBikeSchema),
  bikeController.update
);

/* SET PRIMARY */
router.put("/:id/primary", protect, bikeController.setPrimary);

/* DELETE BIKE */
router.delete("/:id", protect, bikeController.remove);

module.exports = router;

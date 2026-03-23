const express = require("express");
const { body } = require("express-validator");

const router = express.Router();

const authController = require("../controllers/authController");
const { validateRegister } = require("../middleware/validateRegister");
const { protect } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

/* ================= REGISTER ================= */
router.post(
  "/register",
  authLimiter,
  validateRegister,
  authController.register
);

/* ================= LOGIN ================= */
router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password is required")
  ],
  authController.login
);

/* ================= GOOGLE LOGIN ================= */
router.post("/google", authController.googleAuth);

/* ================= REFRESH TOKEN ================= */
router.post("/refresh", authController.refreshToken);

/* ================= LOGOUT ================= */
router.post("/logout", protect, authController.logout);

module.exports = router;

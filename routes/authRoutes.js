const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const validate = require("../middleware/validate");
const { registerSchema, loginSchema, refreshSchema, logoutSchema } = require("../validators/authValidator");
const { protect } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

/* ================= REGISTER ================= */
router.post("/register", authLimiter, validate(registerSchema), authController.register);

/* ================= LOGIN ================= */
router.post("/login", authLimiter, validate(loginSchema), authController.login);

/* ================= GOOGLE LOGIN ================= */
router.post("/google", authController.googleAuth);

/* ================= REFRESH TOKEN ================= */
router.post("/refresh", validate(refreshSchema), authController.refreshToken);

/* ================= LOGOUT ================= */
router.post("/logout", protect, validate(logoutSchema), authController.logout);

module.exports = router;

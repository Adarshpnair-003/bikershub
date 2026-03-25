const express = require("express");
const { body } = require("express-validator");

const router = express.Router();

const authController = require("../controllers/authController");
const { validateRegister } = require("../middleware/validateRegister");

/* ================= REGISTER ================= */
router.post(
  "/register",
  validateRegister,
  authController.register
);

/* ================= LOGIN ================= */
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password is required")
  ],
  authController.login
);

/* ================= REFRESH TOKEN ================= */
router.post(
  "/refresh",
  [
    body("refreshToken")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Refresh token is required")
  ],
  authController.refreshAccessToken
);

/* ================= GOOGLE LOGIN ================= */
router.post("/google", authController.googleAuth);

/* ================= LOGOUT ================= */
router.post("/logout", authController.logout);

module.exports = router;
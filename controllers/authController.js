const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");
const env = require("../config/env");

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const getUserDisplay = (user) => ({
  id: user._id,
  username: user.username || user.name,
  email: user.email,
  profilePic: user.profilePic
});

/**
 * Issue a short-lived access token and a long-lived refresh token.
 * The refresh token is stored as a SHA-256 hash so a DB breach does not
 * expose usable tokens. The raw token is returned to the client only.
 */
async function issueTokens(userId) {
  const accessToken = jwt.sign(
    { id: userId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY }
  );

  const rawRefresh = crypto.randomBytes(40).toString("hex");
  const hash = crypto.createHash("sha256").update(rawRefresh).digest("hex");
  const family = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({
    token: hash,   // hashed — never the raw token
    userId,
    family,
    expiresAt
  });

  return { accessToken, refreshToken: rawRefresh }; // raw token returned to client
}


/* ================= REGISTER ================= */
exports.register = catchAsync(async (req, res, next) => {
  const { username, name, email, password } = req.body;
  const normalizedUsername = (username || name || "").trim();

  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new AppError("User already exists", 400, "DUPLICATE_EMAIL"));
  }

  const newUser = await User.create({
    username: normalizedUsername,
    name: normalizedUsername,
    email,
    password  // hashed by User pre-save hook
  });

  res.status(201).json(apiResponse.success(
    { userId: newUser._id },
    "User registered successfully"
  ));
});


/* ================= LOGIN ================= */
exports.login = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400, "VALIDATION_ERROR"));
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email });

  // Same message for all failure cases — prevents email enumeration
  if (!user || user.isSocialLogin || !user.password) {
    return next(new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS"));
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return next(new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS"));
  }

  const { accessToken, refreshToken } = await issueTokens(user._id);

  res.json(apiResponse.success(
    { token: accessToken, refreshToken, user: getUserDisplay(user) },
    "Login successful"
  ));
});


/* ================= GOOGLE AUTH ================= */
exports.googleAuth = catchAsync(async (req, res, next) => {
  const { token } = req.body;
  if (!token) return next(new AppError("No token provided", 400, "MISSING_TOKEN"));

  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: env.GOOGLE_CLIENT_ID
  });
  const { email, name, picture, sub } = ticket.getPayload();

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      username: name || email.split("@")[0],
      name: name || email.split("@")[0],
      email,
      googleId: sub,
      profilePic: { url: picture || "" },
      isSocialLogin: true
      // No password field — Google users authenticate via token only
    });
  }

  const { accessToken, refreshToken } = await issueTokens(user._id);

  res.json(apiResponse.success(
    { token: accessToken, refreshToken, user: getUserDisplay(user) },
    "Google login successful"
  ));
});


/* ================= REFRESH TOKEN ================= */
exports.refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return next(new AppError("Refresh token required", 400, "MISSING_TOKEN"));

  // Hash the incoming token before lookup — DB stores hashes only
  const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const stored = await RefreshToken.findOne({ token: hash });

  if (!stored) {
    return next(new AppError("Invalid refresh token", 401, "INVALID_TOKEN"));
  }

  // Reuse detection: if token is already revoked, the entire family is compromised —
  // revoke all tokens in the family to force re-login on all devices
  if (stored.revoked) {
    await RefreshToken.updateMany({ family: stored.family }, { revoked: true });
    return next(new AppError("Refresh token reuse detected. Please log in again.", 401, "TOKEN_REUSE"));
  }

  // Check expiry (belt-and-suspenders: TTL index handles cleanup, but we still reject here)
  if (stored.expiresAt < new Date()) {
    stored.revoked = true;
    await stored.save();
    return next(new AppError("Refresh token expired. Please log in again.", 401, "TOKEN_EXPIRED"));
  }

  // Revoke the used token (rotation — old token can never be reused)
  stored.revoked = true;
  await stored.save();

  // Issue new refresh token in the same family (preserves reuse detection chain)
  const rawRefresh = crypto.randomBytes(40).toString("hex");
  const newHash = crypto.createHash("sha256").update(rawRefresh).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    token: newHash,   // hashed — never the raw token
    userId: stored.userId,
    family: stored.family,  // preserve family for reuse detection
    expiresAt
  });

  const accessToken = jwt.sign(
    { id: stored.userId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY }
  );

  res.json(apiResponse.success(
    { token: accessToken, refreshToken: rawRefresh },  // raw token to client
    "Token refreshed"
  ));
});


/* ================= LOGOUT ================= */
exports.logout = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return next(new AppError("Refresh token required", 400, "MISSING_TOKEN"));

  const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await RefreshToken.findOneAndUpdate(
    { token: hash, userId: req.user.id },
    { revoked: true }
  );

  res.json(apiResponse.success(null, "Logged out successfully"));
});

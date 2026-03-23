const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const AppError = require("../utils/AppError");
const env = require("../config/env");

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function issueTokens(userId) {
  const accessToken = jwt.sign({ id: userId }, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRY });
  const rawRefresh = crypto.randomBytes(40).toString("hex");
  const family = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ token: hashToken(rawRefresh), userId, family, expiresAt });
  return { token: accessToken, refreshToken: rawRefresh };
}

exports.register = async ({ username, name, email, password }) => {
  const normalizedUsername = (username || name || "").trim();
  if (await User.findOne({ email })) throw new AppError("User already exists", 400, "DUPLICATE_EMAIL");
  const user = await User.create({ username: normalizedUsername, name: normalizedUsername, email, password });
  return { userId: user._id };
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user || user.isSocialLogin || !user.password)
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  if (!await bcrypt.compare(password, user.password))
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  const tokens = await issueTokens(user._id);
  return { ...tokens, user: { id: user._id, username: user.username || user.name, email: user.email, profilePic: user.profilePic } };
};

exports.googleAuth = async (idToken) => {
  const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  const { email, name, picture, sub } = ticket.getPayload();
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      username: name || email.split("@")[0],
      name: name || email.split("@")[0],
      email, googleId: sub,
      profilePic: { url: picture || "" },
      isSocialLogin: true
    });
  }
  const tokens = await issueTokens(user._id);
  return { ...tokens, user: { id: user._id, username: user.username || user.name, email: user.email, profilePic: user.profilePic } };
};

exports.refreshToken = async (rawToken) => {
  const hash = hashToken(rawToken);
  const stored = await RefreshToken.findOne({ token: hash });
  if (!stored) throw new AppError("Invalid refresh token", 401, "INVALID_TOKEN");
  if (stored.revoked) {
    await RefreshToken.updateMany({ family: stored.family }, { revoked: true });
    throw new AppError("Refresh token reuse detected. Please log in again.", 401, "TOKEN_REUSE");
  }
  if (stored.expiresAt < new Date()) {
    stored.revoked = true;
    await stored.save();
    throw new AppError("Refresh token expired. Please log in again.", 401, "TOKEN_EXPIRED");
  }
  stored.revoked = true;
  await stored.save();
  const rawRefresh = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ token: hashToken(rawRefresh), userId: stored.userId, family: stored.family, expiresAt });
  const accessToken = jwt.sign({ id: stored.userId }, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRY });
  return { token: accessToken, refreshToken: rawRefresh };
};

exports.logout = async (rawToken, userId) => {
  await RefreshToken.findOneAndUpdate({ token: hashToken(rawToken), userId }, { revoked: true });
};

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "1h";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

const getRefreshSecret = () => process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

const getUserDisplay = (user) => ({
  id: user._id,
  username: user.username || user.name,
  email: user.email,
  profilePic: user.profilePic
});

const createAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN
  });

const createRefreshToken = (userId) =>
  jwt.sign({ id: userId }, getRefreshSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN
  });

const buildAuthResponse = (user) => {
  const token = createAccessToken(user._id);
  const refreshToken = createRefreshToken(user._id);

  return {
    token,
    refreshToken,
    user: getUserDisplay(user)
  };
};

const getRefreshTokenFromRequest = (req) => {
  const bodyToken = req.body && typeof req.body.refreshToken === "string"
    ? req.body.refreshToken.trim()
    : "";

  if (bodyToken) {
    return bodyToken;
  }

  const authorization = req.headers.authorization || req.headers.Authorization;

  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    const bearerToken = authorization.slice(7).trim();
    return bearerToken || "";
  }

  return "";
};

/* ================= REGISTER ================= */
exports.register = async (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    const normalizedUsername = (username || name || "").trim();
    const normalizedEmail = (email || "").trim().toLowerCase();

    const userExists = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }]
    });

    if (userExists) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const newUser = await User.create({
      username: normalizedUsername,
      name: normalizedUsername,
      email: normalizedEmail,
      password  // hashed by User pre-save hook
    });

    // 🏆 ACHIEVEMENT — Early Bird (first 100 users)
    require("../services/achievementService").checkEarlyBird(newUser._id).catch(() => {});

    res.status(201).json({
      success: true,
      data: buildAuthResponse(newUser),
      message: "User registered successfully"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    // Same message for all cases — prevents email enumeration
    if (!user || user.isSocialLogin || !user.password) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    res.json({
      success: true,
      data: buildAuthResponse(user),
      message: "Login successful"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/* ================= GOOGLE AUTH ================= */
exports.googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ msg: "No token provided" });
    }

    // ✅ VERIFY GOOGLE TOKEN
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    const { email, email_verified, name, picture, sub } = payload;

    if (!email || !email_verified) {
      return res.status(400).json({ msg: "Google account email is not verified" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });

    // ================= AUTO REGISTER =================
    if (!user) {
      user = await User.create({
        username: name || email.split("@")[0],
        name: name || email.split("@")[0],
        email: normalizedEmail,
        googleId: sub,
        profilePic: {
          url: picture
        },
        isSocialLogin: true
        // No password field — Google users authenticate via token only
      });
    }

    // ================= LOGIN =================
    res.json({
      success: true,
      data: buildAuthResponse(user),
      message: "Google login successful"
    });

  } catch (error) {
    console.error("GOOGLE AUTH ERROR:", error);
    res.status(500).json({ error: "Google login failed" });
  }
};


/* ================= LOGOUT ================= */
exports.logout = async (req, res) => {
  try {
    // Client should discard tokens; server acknowledges
    res.json({ success: true, data: null, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: "Logout failed" } });
  }
};

/* ================= REFRESH ACCESS TOKEN ================= */
exports.refreshAccessToken = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const refreshToken = getRefreshTokenFromRequest(req);

    if (!refreshToken) {
      return res.status(400).json({ msg: "Refresh token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, getRefreshSecret());
    } catch (err) {
      return res.status(401).json({ msg: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ msg: "Invalid refresh token" });
    }

    const token = createAccessToken(user._id);
    const rotatedRefreshToken = createRefreshToken(user._id);

    res.json({
      success: true,
      data: {
        token,
        refreshToken: rotatedRefreshToken,
        user: getUserDisplay(user)
      },
      message: "Token refreshed"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
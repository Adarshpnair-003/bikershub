const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const getUserDisplay = (user) => ({
  id: user._id,
  username: user.username || user.name,
  email: user.email,
  profilePic: user.profilePic
});

/* ================= REGISTER ================= */
exports.register = async (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    const normalizedUsername = (username || name || "").trim();

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const newUser = await User.create({
      username: normalizedUsername,
      name: normalizedUsername,
      email,
      password  // hashed by User pre-save hook
    });

    res.status(201).json({
      msg: "User registered successfully",
      userId: newUser._id
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

    const user = await User.findOne({ email });

    // Same message for all cases — prevents email enumeration
    if (!user || user.isSocialLogin || !user.password) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      msg: "Login successful",
      token,
      user: getUserDisplay(user)
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

    const { email, name, picture, sub } = payload;

    let user = await User.findOne({ email });

    // ================= AUTO REGISTER =================
    if (!user) {
      user = await User.create({
        username: name || email.split("@")[0],
        name: name || email.split("@")[0],
        email,
        googleId: sub,
        profilePic: {
          url: picture
        },
        isSocialLogin: true
        // No password field — Google users authenticate via token only
      });
    }

    // ================= LOGIN =================
    const jwtToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      msg: "Google login successful",
      token: jwtToken,
      user: getUserDisplay(user)
    });

  } catch (error) {
    console.error("GOOGLE AUTH ERROR:", error);
    res.status(500).json({ error: "Google login failed" });
  }
};
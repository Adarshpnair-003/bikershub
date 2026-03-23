const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true   // fast lookup on token hash
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  family: {
    type: String,
    required: true  // used for rotation reuse detection — same family = same login session
  },
  expiresAt: {
    type: Date,
    required: true
  },
  revoked: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// TTL index — MongoDB automatically removes expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);

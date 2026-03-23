const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true
    // indexed below with unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
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

// Explicit indexes — consistent with all other models in this codebase
refreshTokenSchema.index({ token: 1 }, { unique: true });   // tokens are security credentials — must be unique
refreshTokenSchema.index({ userId: 1 });                     // look up all tokens for a user (logout all devices)
refreshTokenSchema.index({ family: 1 });                     // revoke entire family on reuse detection
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL — auto-delete expired tokens

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);

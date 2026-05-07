const mongoose = require("mongoose");

const STORY_TTL_HOURS = 24;

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    media: {
      url: { type: String, required: true },
      public_id: { type: String },
      type: { type: String, enum: ["image", "video"], default: "image" }
    },
    caption: { type: String, default: "", maxlength: 200 },
    expiresAt: {
      type: Date,
      required: true,
      // MongoDB removes the document at this time
      index: { expires: 0 }
    },
    viewers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }]
  },
  { timestamps: true }
);

storySchema.statics.makeExpiry = function () {
  return new Date(Date.now() + STORY_TTL_HOURS * 60 * 60 * 1000);
};

module.exports = mongoose.model("Story", storySchema);
module.exports.TTL_HOURS = STORY_TTL_HOURS;

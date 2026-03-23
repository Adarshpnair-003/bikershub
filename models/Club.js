const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    description: {
      type: String,
      maxlength: 500
    },

    location: {
      type: String
    },

    isPrivate: {
      type: Boolean,
      default: false
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    joinRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  { timestamps: true }
);

clubSchema.index({ owner: 1 });
clubSchema.index({ members: 1 });

module.exports = mongoose.model("Club", clubSchema);
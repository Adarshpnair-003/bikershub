const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      default: null
    },

    // ✅ ADD THIS BLOCK
    media: [
      {
        url: {
          type: String
        },
        public_id: {
          type: String
        },
        type: {
          type: String // image / video
        }
      }
    ],

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    commentsCount: {
      type: Number,
      default: 0
    },

    poll: {
      type: {
        options: [
          {
            _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
            label: { type: String, required: true, maxlength: 60 },
            votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
          }
        ],
        multiSelect: { type: Boolean, default: false },
        closesAt: { type: Date, default: null },
        closed: { type: Boolean, default: false }
      },
      default: undefined
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
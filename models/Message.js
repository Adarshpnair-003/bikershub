const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
{
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  text: {
    type: String
  },

  type: {
    type: String,
    enum: ["text", "image", "location"],
    default: "text"
  },

  readBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  originalText: { type: String, default: null }

},
{ timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
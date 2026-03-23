const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
{
 participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],

  /* conversation type */
  type: {
    type: String,
    enum: ["direct", "club", "ride"],
    default: "direct"
  },

  /* reference if group chat */
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club"
  },

  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ride"
  },
  
  lastMessage: {
    type: String,
    default: ""
  },

  lastMessageAt: {
    type: Date
  }

},
{ timestamps: true }
);

conversationSchema.index({ participants: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);
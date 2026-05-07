const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
{
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  type: {
    type: String,
    enum: [
      "like",
      "comment",
      "club_request",
      "club_approved",
      "club_rejected",
      "ride_invite",
      "ride_join",
      "follow",
      "mention",
      "achievement"
    ]
  },

  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post"
  },

  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club"
  },

  ride: {                    
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ride"
  },

  isRead: {
    type: Boolean,
    default: false
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
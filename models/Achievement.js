const mongoose = require("mongoose");

const ACHIEVEMENT_TYPES = [
  "FIRST_POST",
  "FIRST_RIDE",
  "RIDE_100KM",
  "RIDE_500KM",
  "TOTAL_1000KM",
  "JOIN_3_CLUBS",
  "BIKE_COLLECTOR",
  "EARLY_BIRD"
];

const achievementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ACHIEVEMENT_TYPES,
      required: true
    }
  },
  { timestamps: { createdAt: "awardedAt", updatedAt: false } }
);

// One award of each type per user, ever
achievementSchema.index({ user: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("Achievement", achievementSchema);
module.exports.TYPES = ACHIEVEMENT_TYPES;

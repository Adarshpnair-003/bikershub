const mongoose = require("mongoose");

const TYPES = ["sport", "cruiser", "adventure", "naked", "tourer", "off-road", "scooter", "other"];

const bikeSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    brand: { type: String, required: true, trim: true, maxlength: 50 },
    model: { type: String, required: true, trim: true, maxlength: 50 },
    year: {
      type: Number,
      required: true,
      min: 1900,
      max: new Date().getFullYear() + 1
    },
    type: { type: String, enum: TYPES, required: true, lowercase: true },
    engineCC: { type: Number, required: true, min: 50, max: 3000 },
    color: { type: String, required: true, trim: true, maxlength: 30 },
    nickname: { type: String, trim: true, maxlength: 40, default: "" },
    photo: {
      url: { type: String, required: true },
      public_id: { type: String, required: true }
    },
    isPrimary: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

// Compound indexes for fast garage queries
bikeSchema.index({ owner: 1, createdAt: -1 });
bikeSchema.index({ owner: 1, isPrimary: 1 });

bikeSchema.statics.TYPES = TYPES;

module.exports = mongoose.model("Bike", bikeSchema);

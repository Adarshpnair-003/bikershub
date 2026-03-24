const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
{
  title: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    default: ""
  },

  startLocation: {
    type: String,
    required: true
  },

  // ✅ IMPORTANT: for nearby search
  startCoords: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  },

  destination: {
    type: String,
    required: true
  },

  destinationCoords: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [lng, lat]
      default: [0, 0],
      required: true
    }
  },

  rideDate: {
    type: Date,
    required: true
  },

  rideImage: {
    type: String,
    default: ""
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club",
    default: null
  },

  participants: [
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
  ],

  maxParticipants: {
    type: Number,
    default: 20
  },

  participantsCount: {
    type: Number,
    default: 0
  },

  commentsCount: {
    type: Number,
    default: 0
  },

  status: {
    type: String,
    enum: ["upcoming", "live", "completed", "cancelled"],
    default: "upcoming"
  },

  // ⏱️ Ride timing
  startTime: {
    type: Date
  },

  endTime: {
    type: Date
  },

  // 🗺️ ROUTE (GeoJSON LineString)
  route: {
    type: {
      type: String,
      enum: ["LineString"],
      default: "LineString"
    },
    coordinates: {
      type: [[Number]], // [lng, lat]
      default: []
    }
  },

  // 📍 LIVE RIDER LOCATIONS (capped at 50 entries — oldest are trimmed on save)
  riderLocations: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point"
        },
        coordinates: [Number] // [lng, lat]
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  // 📊 Ride statistics
  totalDistance: {
    type: Number,
    default: 0 // km
  },

  averageSpeed: {
    type: Number,
    default: 0 // km/h
  },

  rideDuration: {
    type: Number,
    default: 0 // seconds
  }

},
{ timestamps: true }
);

/* ============================
   PRE-SAVE HOOKS
============================ */

// Cap riderLocations at 50 entries to prevent unbounded document growth
rideSchema.pre("save", function (next) {
  if (this.isModified("riderLocations") && this.riderLocations.length > 50) {
    this.riderLocations = this.riderLocations.slice(-50);
  }
  if (this.isModified("route.coordinates") && this.route.coordinates.length > 2000) {
    this.route.coordinates = this.route.coordinates.slice(-2000);
  }
  next();
});

/* ============================
   INDEXES (VERY IMPORTANT)
============================ */

// 🔍 For nearby ride search
rideSchema.index({ startCoords: "2dsphere" });
rideSchema.index({ destinationCoords: "2dsphere" });
// 🗺️ For route-based geo queries (optional but useful)
rideSchema.index({ route: "2dsphere" });
rideSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Ride", rideSchema);
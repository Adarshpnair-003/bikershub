const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
{
    username: {
        type: String,
        required: true,
        unique: true,  // unique already creates an index — no need for index: true
        trim: true,
        minlength: 3
    },

    // Kept for backward compatibility with existing records/controllers.
    name: {
        type: String,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },

    password: {
        type: String
        // Not required — Google OAuth users have no password
    },

    phone: {
        type: String
    },

    profilePic: {
        url: {
            type: String,
            default: ""
        },
        public_id: {
            type: String,
            default: ""
        }
    },

    googleId: {
        type: String,
        sparse: true  // sparse index — only indexes docs where googleId exists (not null/undefined)
    },

    isSocialLogin: {
        type: Boolean,
        default: false
    },

    bio: {
        type: String,
        default: "",
        maxlength: 500
    },

    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },

    followers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],

    following: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],

    ridesCreated: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Ride"
        }
    ],

    ridesJoined: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Ride"
        }
    ],

    rideCreatedCount: {
        type: Number,
        default: 0
    },

    rideJoinedCount: {
        type: Number,
        default: 0
    },

    rating: {
        type: Number,
        default: 0
    },

    ratingCount: {
        type: Number,
        default: 0
    },

    isVerified: {
        type: Boolean,
        default: false
    }

},
{ timestamps: true }
);

userSchema.pre("validate", function syncNameFields(next) {
    if (!this.username && this.name) {
        this.username = this.name;
    }
    if (!this.name && this.username) {
        this.name = this.username;
    }
    next();
});

userSchema.pre("save", async function hashPassword(next) {
    if (!this.isModified("password") || !this.password) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

module.exports = mongoose.model("User", userSchema);

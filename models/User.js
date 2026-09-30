const mongoose = require("mongoose");

const USER_ROLES = [
  "ADMIN",
  "LENDER",
  "BORROWER"
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: USER_ROLES,
      default: "BORROWER",
      required: true,
      index: true
    },

    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    year: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },

    phone: {
      type: String,
      trim: true,
      default: ""
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true
    },

    otpHash: {
      type: String,
      default: null,
      select: false
    },

    otpExpiry: {
      type: Date,
      default: null,
      select: false
    },

    otpAttempts: {
      type: Number,
      default: 0,
      select: false
    },

    otpLastSentAt: {
      type: Date,
      default: null,
      select: false
    },

    trustScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },

    profileImage: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "User",
  userSchema
);
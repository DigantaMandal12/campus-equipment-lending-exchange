const mongoose = require("mongoose");

const EQUIPMENT_CONDITIONS = [
  "NEW",
  "LIKE_NEW",
  "GOOD",
  "FAIR",
  "NEEDS_REPAIR"
];

const EQUIPMENT_STATUSES = [
  "AVAILABLE",
  "UNAVAILABLE",
  "DRAFT"
];

const equipmentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
      index: true
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000
    },

    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true
    },

    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true
    },

    condition: {
      type: String,
      enum: EQUIPMENT_CONDITIONS,
      required: true,
      default: "GOOD",
      index: true
    },

    images: {
      type: [String],
      default: []
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    availableQuantity: {
      type: Number,
      required: true,
      min: 0
    },

    rentalFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    securityDeposit: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    borrowingTerms: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ""
    },

    status: {
      type: String,
      enum: EQUIPMENT_STATUSES,
      default: "AVAILABLE",
      index: true
    }
  },
  {
    timestamps: true
  }
);

equipmentSchema.index({
  name: "text",
  description: "text",
  category: "text"
});

equipmentSchema.pre(
  "validate",
  function (next) {
    if (
      this.availableQuantity >
      this.quantity
    ) {
      return next(
        new Error(
          "Available quantity cannot exceed total quantity."
        )
      );
    }

    if (
      this.availableQuantity === 0 &&
      this.status === "AVAILABLE"
    ) {
      this.status = "UNAVAILABLE";
    }

    if (
      this.availableQuantity > 0 &&
      this.status === "UNAVAILABLE"
    ) {
      this.status = "AVAILABLE";
    }

    next();
  }
);

module.exports =
  mongoose.models.Equipment ||
  mongoose.model(
    "Equipment",
    equipmentSchema
  );
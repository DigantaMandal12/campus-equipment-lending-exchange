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

    /*
     * Equipment images uploaded through Multer.
     *
     * Phase 3D rules:
     * - Maximum 5 images
     * - Stored as relative public URLs
     */
    images: {
      type: [
        {
          type: String,
          trim: true
        }
      ],

      default: [],

      validate: {
        validator: function (images) {
          return (
            Array.isArray(images) &&
            images.length <= 5
          );
        },

        message:
          "A maximum of 5 equipment images is allowed."
      }
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,

      validate: {
        validator: Number.isInteger,
        message:
          "Quantity must be a whole number."
      }
    },

    availableQuantity: {
      type: Number,
      required: true,
      min: 0,

      validate: {
        validator: Number.isInteger,
        message:
          "Available quantity must be a whole number."
      }
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

/*
 * Text search index.
 */
equipmentSchema.index({
  name: "text",
  description: "text",
  category: "text"
});

/*
 * Compound indexes useful for equipment browsing.
 */
equipmentSchema.index({
  status: 1,
  availableQuantity: 1
});

equipmentSchema.index({
  owner: 1,
  createdAt: -1
});

/*
 * Inventory consistency validation.
 */
equipmentSchema.pre(
  "validate",
  function (next) {
    /*
     * Total quantity must be valid.
     */
    if (
      !Number.isInteger(this.quantity) ||
      this.quantity < 1
    ) {
      return next(
        new Error(
          "Quantity must be a whole number greater than 0."
        )
      );
    }

    /*
     * Available quantity must be valid.
     */
    if (
      !Number.isInteger(
        this.availableQuantity
      ) ||
      this.availableQuantity < 0
    ) {
      return next(
        new Error(
          "Available quantity must be a whole number greater than or equal to 0."
        )
      );
    }

    /*
     * Available stock can never exceed
     * total physical stock.
     */
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

    /*
     * DRAFT is intentionally preserved.
     *
     * Only normal inventory states are automatically
     * synchronized.
     */
    if (
      this.status !== "DRAFT"
    ) {
      if (
        this.availableQuantity === 0
      ) {
        this.status = "UNAVAILABLE";
      } else {
        this.status = "AVAILABLE";
      }
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
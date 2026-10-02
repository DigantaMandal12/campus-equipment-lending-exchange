const mongoose = require("mongoose");

const ratingSchema =
  new mongoose.Schema(
    {
      transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
        required: true,
        index: true
      },

      giver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
      },

      receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
      },

      equipment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Equipment",
        required: true,
        index: true
      },

      equipmentConditionRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,

        validate: {
          validator: Number.isInteger,
          message:
            "Equipment condition rating must be a whole number from 1 to 5."
        }
      },

      punctualityRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,

        validate: {
          validator: Number.isInteger,
          message:
            "Punctuality rating must be a whole number from 1 to 5."
        }
      },

      overallRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,

        validate: {
          validator: Number.isInteger,
          message:
            "Overall rating must be a whole number from 1 to 5."
        }
      },

      comment: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ""
      }
    },
    {
      timestamps: true
    }
  );


/*
 * One person can submit only one rating
 * for a particular transaction.
 *
 * This is the main duplicate-rating protection.
 */
ratingSchema.index(
  {
    transaction: 1,
    giver: 1
  },
  {
    unique: true
  }
);


/*
 * Useful query indexes.
 */
ratingSchema.index({
  receiver: 1,
  createdAt: -1
});

ratingSchema.index({
  equipment: 1,
  createdAt: -1
});


/*
 * A user cannot rate himself.
 */
ratingSchema.pre(
  "validate",
  function (next) {

    if (
      this.giver &&
      this.receiver &&
      this.giver.toString() ===
        this.receiver.toString()
    ) {

      return next(
        new Error(
          "A user cannot rate himself."
        )
      );

    }

    next();

  }
);


const Rating =
  mongoose.models.Rating ||
  mongoose.model(
    "Rating",
    ratingSchema
  );


module.exports = Rating;
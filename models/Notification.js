const mongoose = require("mongoose");

const NOTIFICATION_TYPES = [
  "DUE_SOON",
  "OVERDUE",
  "SYSTEM"
];

const notificationSchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
      },

      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150
      },

      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
      },

      type: {
        type: String,
        enum: NOTIFICATION_TYPES,
        required: true,
        index: true
      },

      read: {
        type: Boolean,
        default: false,
        index: true
      },

      relatedTransaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
        default: null,
        index: true
      }
    },
    {
      timestamps: true
    }
  );


/*
 * One due reminder per user + transaction.
 *
 * This prevents the hourly scheduler from creating
 * duplicate reminders for the same borrowing.
 */
notificationSchema.index(
  {
    user: 1,
    type: 1,
    relatedTransaction: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      relatedTransaction: {
        $type: "objectId"
      }
    }
  }
);


const Notification =
  mongoose.models.Notification ||
  mongoose.model(
    "Notification",
    notificationSchema
  );


module.exports = Notification;
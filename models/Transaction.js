const mongoose = require("mongoose");

const TRANSACTION_STATUSES = [
  "PENDING_APPROVAL",
  "REJECTED",
  "APPROVED",
  "ACTIVE",
  "RETURN_REQUESTED",
  "RETURNED",
  "COMPLETED",
  "CANCELLED",
  "OVERDUE"
];

const PAYMENT_STATUSES = [
  "NOT_STARTED",
  "PENDING_VERIFICATION",
  "DEPOSIT_CONFIRMED",
  "PAYMENT_REJECTED",
  "REFUND_PENDING",
  "REFUNDED"
];

const DEPOSIT_REFUND_STATUSES = [
  "NOT_APPLICABLE",
  "PENDING",
  "PROCESSING",
  "REFUNDED",
  "WITHHELD"
];

const transactionSchema =
  new mongoose.Schema(
    {
      borrower: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
      },

      lender: {
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

      requestDate: {
        type: Date,
        required: true,
        default: Date.now
      },

      requestedReturnDate: {
        type: Date,
        required: true
      },

      approvedDate: {
        type: Date,
        default: null
      },

      handoverDate: {
        type: Date,
        default: null
      },

      actualReturnDate: {
        type: Date,
        default: null
      },

      status: {
        type: String,
        enum: TRANSACTION_STATUSES,
        required: true,
        default: "PENDING_APPROVAL",
        index: true
      },

      rentalFee: {
        type: Number,
        required: true,
        min: 0
      },

      securityDeposit: {
        type: Number,
        required: true,
        min: 0
      },

      paymentStatus: {
        type: String,
        enum: PAYMENT_STATUSES,
        required: true,
        default: "NOT_STARTED",
        index: true
      },

      paymentReference: {
        type: String,
        trim: true,
        maxlength: 120,
        default: ""
      },

      depositRefundStatus: {
        type: String,
        enum: DEPOSIT_REFUND_STATUSES,
        required: true,
        default: "NOT_APPLICABLE",
        index: true
      },

      returnedCondition: {
        type: String,
        trim: true,
        maxlength: 100,
        default: ""
      },

      lateDays: {
        type: Number,
        min: 0,
        default: 0
      },

      damageReported: {
        type: Boolean,
        default: false
      },

      trustPointsChange: {
        type: Number,
        default: 0
      },

      rejectionReason: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ""
      }
    },
    {
      timestamps: true
    }
  );


/*
 * Borrower request history
 */
transactionSchema.index({
  borrower: 1,
  status: 1,
  createdAt: -1
});


/*
 * Lender request history
 */
transactionSchema.index({
  lender: 1,
  status: 1,
  createdAt: -1
});


/*
 * Equipment transaction history
 */
transactionSchema.index({
  equipment: 1,
  status: 1,
  createdAt: -1
});


/*
 * Requested return date validation
 */
transactionSchema.pre(
  "validate",
  function (next) {
    if (
      this.requestedReturnDate &&
      this.requestDate &&
      this.requestedReturnDate <=
        this.requestDate
    ) {
      return next(
        new Error(
          "Requested return date must be after the request date."
        )
      );
    }

    next();
  }
);


/*
 * IMPORTANT:
 * Export the Mongoose model itself.
 *
 * This allows:
 * Transaction.findOne()
 * Transaction.create()
 * Transaction.find()
 * etc.
 */
const Transaction =
  mongoose.models.Transaction ||
  mongoose.model(
    "Transaction",
    transactionSchema
  );


module.exports = Transaction;
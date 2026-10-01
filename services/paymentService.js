const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Transaction = require("../models/Transaction");

let paymentReferenceIndexPromise = null;

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createServiceError(
      `Invalid ${fieldName}.`,
      400
    );
  }
}

function normalizeReference(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function parsePaymentAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw createServiceError(
      "Invalid payment amount."
    );
  }

  return Number(amount.toFixed(2));
}

/*
 * Unique payment reference protection.
 *
 * Empty paymentReference values are excluded from
 * the index, so existing transactions with an empty
 * reference do not conflict.
 */
async function ensurePaymentReferenceIndex() {
  await connectDB();

  if (!paymentReferenceIndexPromise) {
    paymentReferenceIndexPromise =
      Transaction.collection.createIndex(
        {
          paymentReference: 1
        },
        {
          unique: true,
          partialFilterExpression: {
            paymentReference: {
              $gt: ""
            }
          }
        }
      ).catch((error) => {
        paymentReferenceIndexPromise = null;
        throw error;
      });
  }

  await paymentReferenceIndexPromise;
}

function buildUpiUri({
  upiId,
  payeeName,
  amount,
  transactionId,
  equipmentName
}) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: Number(amount).toFixed(2),
    cu: "INR",
    tn: `Campus Exchange - ${equipmentName} - ${transactionId}`
  });

  return `upi://pay?${params.toString()}`;
}

async function getPaymentDetails(
  borrowerId,
  transactionId
) {
  await connectDB();

  validateObjectId(
    borrowerId,
    "borrower ID"
  );

  validateObjectId(
    transactionId,
    "transaction ID"
  );

  const transaction =
    await Transaction.findOne({
      _id: transactionId,
      borrower: borrowerId
    })
      .populate(
        "equipment",
        "name description category department condition images quantity availableQuantity rentalFee securityDeposit status borrowingTerms"
      )
      .populate(
        "lender",
        "name email department year trustScore"
      )
      .lean();

  if (!transaction) {
    throw createServiceError(
      "Borrow transaction was not found.",
      404
    );
  }

  return transaction;
}

async function submitPaymentReference(
  borrowerId,
  transactionId,
  data
) {
  await ensurePaymentReferenceIndex();

  validateObjectId(
    borrowerId,
    "borrower ID"
  );

  validateObjectId(
    transactionId,
    "transaction ID"
  );

  const paymentReference =
    normalizeReference(
      data.paymentReference
    );

  if (
    paymentReference.length < 6 ||
    paymentReference.length > 80
  ) {
    throw createServiceError(
      "UTR / payment reference must be between 6 and 80 characters."
    );
  }

  const paymentAmount =
    parsePaymentAmount(data.amount);

  const existingTransaction =
    await Transaction.findOne({
      _id: transactionId,
      borrower: borrowerId
    }).lean();

  if (!existingTransaction) {
    throw createServiceError(
      "Borrow transaction was not found.",
      404
    );
  }

  if (
    existingTransaction.status !==
    "APPROVED"
  ) {
    throw createServiceError(
      `Payment cannot be submitted because the transaction status is ${existingTransaction.status}.`,
      409
    );
  }

  if (
    ![
      "NOT_STARTED",
      "PAYMENT_REJECTED"
    ].includes(
      existingTransaction.paymentStatus
    )
  ) {
    throw createServiceError(
      `Payment cannot be submitted because its current payment status is ${existingTransaction.paymentStatus}.`,
      409
    );
  }

  const requiredDeposit = Number(
    existingTransaction.securityDeposit || 0
  );

  if (requiredDeposit <= 0) {
    throw createServiceError(
      "This transaction does not require a security deposit."
    );
  }

  if (
    paymentAmount !== requiredDeposit
  ) {
    throw createServiceError(
      `Payment amount must exactly match the required security deposit of ₹${requiredDeposit}.`
    );
  }

  try {
    const updatedTransaction =
      await Transaction.findOneAndUpdate(
        {
          _id: transactionId,
          borrower: borrowerId,
          status: "APPROVED",
          paymentStatus: {
            $in: [
              "NOT_STARTED",
              "PAYMENT_REJECTED"
            ]
          }
        },
        {
          $set: {
            paymentReference,
            paymentStatus:
              "PENDING_VERIFICATION"
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

    if (!updatedTransaction) {
      throw createServiceError(
        "Payment state changed before your submission could be saved.",
        409
      );
    }

    return updatedTransaction;
  } catch (error) {
    if (error.code === 11000) {
      throw createServiceError(
        "This UTR / payment reference has already been used.",
        409
      );
    }

    throw error;
  }
}

async function getPendingPaymentVerifications(
  lenderId
) {
  await connectDB();

  validateObjectId(
    lenderId,
    "lender ID"
  );

  return Transaction.find({
    lender: lenderId,
    status: "APPROVED",
    paymentStatus:
      "PENDING_VERIFICATION"
  })
    .populate(
      "borrower",
      "name email department year trustScore"
    )
    .populate(
      "equipment",
      "name category department condition images rentalFee securityDeposit quantity availableQuantity status"
    )
    .sort({
      updatedAt: -1
    })
    .lean();
}

async function verifyPayment(
  lenderId,
  transactionId
) {
  await connectDB();

  validateObjectId(
    lenderId,
    "lender ID"
  );

  validateObjectId(
    transactionId,
    "transaction ID"
  );

  const transaction =
    await Transaction.findOneAndUpdate(
      {
        _id: transactionId,
        lender: lenderId,
        status: "APPROVED",
        paymentStatus:
          "PENDING_VERIFICATION",
        paymentReference: {
          $gt: ""
        }
      },
      {
        $set: {
          paymentStatus:
            "DEPOSIT_CONFIRMED"
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

  if (transaction) {
    return transaction;
  }

  const existing =
    await Transaction.findOne({
      _id: transactionId
    }).select(
      "lender status paymentStatus"
    );

  if (!existing) {
    throw createServiceError(
      "Payment transaction was not found.",
      404
    );
  }

  if (
    String(existing.lender) !==
    String(lenderId)
  ) {
    throw createServiceError(
      "You are not authorized to verify this payment.",
      403
    );
  }

  throw createServiceError(
    `This payment cannot be verified because its current status is ${existing.paymentStatus}.`,
    409
  );
}

async function rejectPayment(
  lenderId,
  transactionId
) {
  await connectDB();

  validateObjectId(
    lenderId,
    "lender ID"
  );

  validateObjectId(
    transactionId,
    "transaction ID"
  );

  const transaction =
    await Transaction.findOneAndUpdate(
      {
        _id: transactionId,
        lender: lenderId,
        status: "APPROVED",
        paymentStatus:
          "PENDING_VERIFICATION"
      },
      {
        $set: {
          paymentStatus:
            "PAYMENT_REJECTED"
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

  if (transaction) {
    return transaction;
  }

  const existing =
    await Transaction.findOne({
      _id: transactionId
    }).select(
      "lender status paymentStatus"
    );

  if (!existing) {
    throw createServiceError(
      "Payment transaction was not found.",
      404
    );
  }

  if (
    String(existing.lender) !==
    String(lenderId)
  ) {
    throw createServiceError(
      "You are not authorized to reject this payment.",
      403
    );
  }

  throw createServiceError(
    `This payment cannot be rejected because its current status is ${existing.paymentStatus}.`,
    409
  );
}

module.exports = {
  buildUpiUri,
  getPaymentDetails,
  submitPaymentReference,
  getPendingPaymentVerifications,
  verifyPayment,
  rejectPayment
};
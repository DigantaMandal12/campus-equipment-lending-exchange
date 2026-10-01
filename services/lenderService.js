const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Transaction = require("../models/Transaction");

const PENDING_APPROVAL = "PENDING_APPROVAL";

function validateObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(`Invalid ${fieldName}.`);
    error.statusCode = 400;
    throw error;
  }
}

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sanitizeRejectionReason(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

async function getIncomingBorrowRequests(lenderId) {
  await connectDB();

  validateObjectId(lenderId, "lender ID");

  return Transaction.find({
    lender: lenderId
  })
    .populate(
      "borrower",
      "name email department year trustScore"
    )
    .populate(
      "equipment",
      "name description category department condition images quantity availableQuantity rentalFee securityDeposit status"
    )
    .sort({ createdAt: -1 })
    .lean();
}

async function approveBorrowRequest(lenderId, transactionId) {
  await connectDB();

  validateObjectId(lenderId, "lender ID");
  validateObjectId(transactionId, "transaction ID");

  const transaction = await Transaction.findOneAndUpdate(
    {
      _id: transactionId,
      lender: lenderId,
      status: PENDING_APPROVAL
    },
    {
      $set: {
        status: "APPROVED",
        approvedDate: new Date(),
        paymentStatus: "NOT_STARTED"
      },
      $unset: {
        rejectionReason: 1
      }
    },
    {
      new: true,
      runValidators: true
    }
  )
    .populate("borrower", "name email department year trustScore")
    .populate(
      "equipment",
      "name category department quantity availableQuantity rentalFee securityDeposit status"
    );

  if (!transaction) {
    const existingTransaction = await Transaction.findOne({
      _id: transactionId
    }).select("lender status");

    if (!existingTransaction) {
      throw createServiceError(
        "Borrow request was not found.",
        404
      );
    }

    if (String(existingTransaction.lender) !== String(lenderId)) {
      throw createServiceError(
        "You are not authorized to approve this request.",
        403
      );
    }

    throw createServiceError(
      `This request cannot be approved because its current status is ${existingTransaction.status}.`,
      409
    );
  }

  return transaction;
}

async function rejectBorrowRequest(
  lenderId,
  transactionId,
  rejectionReason
) {
  await connectDB();

  validateObjectId(lenderId, "lender ID");
  validateObjectId(transactionId, "transaction ID");

  const cleanReason = sanitizeRejectionReason(rejectionReason);

  if (cleanReason.length < 5) {
    throw createServiceError(
      "Please provide a rejection reason of at least 5 characters."
    );
  }

  if (cleanReason.length > 500) {
    throw createServiceError(
      "Rejection reason cannot exceed 500 characters."
    );
  }

  const transaction = await Transaction.findOneAndUpdate(
    {
      _id: transactionId,
      lender: lenderId,
      status: PENDING_APPROVAL
    },
    {
      $set: {
        status: "REJECTED",
        rejectionReason: cleanReason
      },
      $unset: {
        approvedDate: 1
      }
    },
    {
      new: true,
      runValidators: true
    }
  )
    .populate("borrower", "name email department year trustScore")
    .populate(
      "equipment",
      "name category department quantity availableQuantity rentalFee securityDeposit status"
    );

  if (!transaction) {
    const existingTransaction = await Transaction.findOne({
      _id: transactionId
    }).select("lender status");

    if (!existingTransaction) {
      throw createServiceError(
        "Borrow request was not found.",
        404
      );
    }

    if (String(existingTransaction.lender) !== String(lenderId)) {
      throw createServiceError(
        "You are not authorized to reject this request.",
        403
      );
    }

    throw createServiceError(
      `This request cannot be rejected because its current status is ${existingTransaction.status}.`,
      409
    );
  }

  return transaction;
}

module.exports = {
  getIncomingBorrowRequests,
  approveBorrowRequest,
  rejectBorrowRequest
};
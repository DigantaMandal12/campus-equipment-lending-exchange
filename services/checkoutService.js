const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Equipment = require("../models/Equipment");
const Transaction = require("../models/Transaction");

const APPROVED = "APPROVED";
const ACTIVE = "ACTIVE";
const DEPOSIT_CONFIRMED = "DEPOSIT_CONFIRMED";

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

async function getCheckoutDetails(
  borrowerId,
  transactionId
) {
  await connectDB();

  validateObjectId(borrowerId, "borrower ID");
  validateObjectId(transactionId, "transaction ID");

  const transaction = await Transaction.findOne({
    _id: transactionId,
    borrower: borrowerId
  })
    .populate(
      "equipment",
      "name description category department condition images quantity availableQuantity rentalFee securityDeposit borrowingTerms status"
    )
    .populate(
      "lender",
      "name email department year trustScore"
    )
    .populate(
      "borrower",
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

async function checkoutBorrowRequest(
  borrowerId,
  transactionId
) {
  await connectDB();

  validateObjectId(borrowerId, "borrower ID");
  validateObjectId(transactionId, "transaction ID");

  const session = await mongoose.startSession();

  try {
    let completedTransaction = null;

    await session.withTransaction(async () => {
      const transaction = await Transaction.findOne({
        _id: transactionId
      }).session(session);

      if (!transaction) {
        throw createServiceError(
          "Borrow transaction was not found.",
          404
        );
      }

      if (
        String(transaction.borrower) !==
        String(borrowerId)
      ) {
        throw createServiceError(
          "You are not authorized to checkout this transaction.",
          403
        );
      }

      if (transaction.status !== APPROVED) {
        throw createServiceError(
          `This transaction cannot be checked out because its current status is ${transaction.status}.`,
          409
        );
      }

      if (
        transaction.paymentStatus !==
        DEPOSIT_CONFIRMED
      ) {
        throw createServiceError(
          "Checkout is locked until the security deposit is confirmed.",
          409
        );
      }

      if (
        !Number.isInteger(transaction.quantity) ||
        transaction.quantity <= 0
      ) {
        throw createServiceError(
          "Transaction quantity is invalid.",
          400
        );
      }

      const equipment = await Equipment.findOne({
        _id: transaction.equipment
      }).session(session);

      if (!equipment) {
        throw createServiceError(
          "Equipment associated with this transaction was not found.",
          404
        );
      }

      if (
        String(equipment.owner) !==
        String(transaction.lender)
      ) {
        throw createServiceError(
          "Equipment ownership does not match the transaction lender.",
          409
        );
      }

      if (equipment.status !== "AVAILABLE") {
        throw createServiceError(
          "This equipment is currently unavailable.",
          409
        );
      }

      if (
        equipment.availableQuantity <
        transaction.quantity
      ) {
        throw createServiceError(
          "There is not enough available stock for this checkout.",
          409
        );
      }

      /*
       * CRITICAL CONCURRENCY PROTECTION
       *
       * MongoDB atomically checks:
       *
       * availableQuantity >= requested quantity
       *
       * and then decrements stock.
       *
       * If another checkout consumes the stock first,
       * this operation returns null and this transaction
       * is aborted.
       */
      const updatedEquipment =
        await Equipment.findOneAndUpdate(
          {
            _id: equipment._id,
            status: "AVAILABLE",
            availableQuantity: {
              $gte: transaction.quantity
            }
          },
          {
            $inc: {
              availableQuantity:
                -transaction.quantity
            }
          },
          {
            new: true,
            session,
            runValidators: true
          }
        );

      if (!updatedEquipment) {
        throw createServiceError(
          "Checkout failed because the available stock changed. Please refresh and try again.",
          409
        );
      }

      const newAvailableQuantity =
        updatedEquipment.availableQuantity;

      await Equipment.updateOne(
        {
          _id: updatedEquipment._id
        },
        {
          $set: {
            status:
              newAvailableQuantity > 0
                ? "AVAILABLE"
                : "UNAVAILABLE"
          }
        },
        {
          session
        }
      );

      const updatedTransaction =
        await Transaction.findOneAndUpdate(
          {
            _id: transaction._id,
            borrower: borrowerId,
            status: APPROVED,
            paymentStatus: DEPOSIT_CONFIRMED
          },
          {
            $set: {
              status: ACTIVE,
              handoverDate: new Date()
            }
          },
          {
            new: true,
            session,
            runValidators: true
          }
        )
          .populate(
            "equipment",
            "name category department quantity availableQuantity status"
          )
          .populate(
            "lender",
            "name email department year trustScore"
          )
          .populate(
            "borrower",
            "name email department year trustScore"
          );

      if (!updatedTransaction) {
        throw createServiceError(
          "Transaction state changed before checkout could be completed.",
          409
        );
      }

      completedTransaction =
        updatedTransaction;
    });

    return completedTransaction;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  getCheckoutDetails,
  checkoutBorrowRequest
};
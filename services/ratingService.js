const mongoose = require("mongoose");

const Rating =
  require("../models/Rating");

const Transaction =
  require("../models/Transaction");


const RATEABLE_TRANSACTION_STATUSES = [
  "RETURNED",
  "COMPLETED"
];


function normalizeObjectId(value) {

  if (
    value instanceof mongoose.Types.ObjectId
  ) {
    return value;
  }

  if (
    !value ||
    !mongoose.Types.ObjectId.isValid(value)
  ) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
}


function validateRatingValue(
  value,
  fieldName
) {

  const numericValue =
    Number(value);

  if (
    !Number.isInteger(numericValue) ||
    numericValue < 1 ||
    numericValue > 5
  ) {

    const error =
      new Error(
        `${fieldName} must be a whole number from 1 to 5.`
      );

    error.statusCode = 400;

    throw error;
  }

  return numericValue;
}


/*
 * Determine whether the logged-in user
 * is allowed to rate this transaction.
 *
 * Borrower:
 *   rates lender
 *
 * Lender:
 *   rates borrower
 */
async function getRatingContext(
  transactionId,
  userId
) {

  const normalizedTransactionId =
    normalizeObjectId(
      transactionId
    );

  const normalizedUserId =
    normalizeObjectId(
      userId
    );


  if (
    !normalizedTransactionId ||
    !normalizedUserId
  ) {

    const error =
      new Error(
        "Invalid transaction or user ID."
      );

    error.statusCode = 400;

    throw error;
  }


  const transaction =
    await Transaction.findById(
      normalizedTransactionId
    )
      .populate(
        "borrower",
        "name email role department year trustScore"
      )
      .populate(
        "lender",
        "name email role department year trustScore"
      )
      .populate(
        "equipment",
        "name category department condition images"
      )
      .lean();


  if (!transaction) {

    const error =
      new Error(
        "Borrow transaction not found."
      );

    error.statusCode = 404;

    throw error;
  }


  if (
    !RATEABLE_TRANSACTION_STATUSES.includes(
      transaction.status
    )
  ) {

    const error =
      new Error(
        "This transaction can be rated only after the equipment has been returned."
      );

    error.statusCode = 400;

    throw error;
  }


  const borrowerId =
    transaction.borrower?._id
      ? transaction.borrower._id.toString()
      : "";

  const lenderId =
    transaction.lender?._id
      ? transaction.lender._id.toString()
      : "";

  const currentUserId =
    normalizedUserId.toString();


  let viewerRole;
  let receiver;


  if (
    currentUserId ===
    borrowerId
  ) {

    viewerRole = "BORROWER";
    receiver = transaction.lender;

  } else if (
    currentUserId ===
    lenderId
  ) {

    viewerRole = "LENDER";
    receiver = transaction.borrower;

  } else {

    const error =
      new Error(
        "You are not a participant in this transaction."
      );

    error.statusCode = 403;

    throw error;

  }


  if (!receiver) {

    const error =
      new Error(
        "The rating recipient could not be identified."
      );

    error.statusCode = 500;

    throw error;
  }


  const existingRating =
    await Rating.findOne({
      transaction:
        normalizedTransactionId,

      giver:
        normalizedUserId
    })
      .populate(
        "receiver",
        "name role trustScore"
      )
      .lean();


  return {
    transaction,
    viewerRole,
    receiver,
    existingRating
  };
}


/*
 * Create a rating for a completed/returned
 * transaction.
 */
async function createRating({
  transactionId,
  giverId,
  equipmentConditionRating,
  punctualityRating,
  overallRating,
  comment
}) {

  const context =
    await getRatingContext(
      transactionId,
      giverId
    );


  if (
    context.existingRating
  ) {

    const error =
      new Error(
        "You have already rated this transaction."
      );

    error.statusCode = 409;

    throw error;
  }


  const condition =
    validateRatingValue(
      equipmentConditionRating,
      "Equipment condition rating"
    );


  const punctuality =
    validateRatingValue(
      punctualityRating,
      "Punctuality rating"
    );


  const overall =
    validateRatingValue(
      overallRating,
      "Overall rating"
    );


  const normalizedComment =
    typeof comment === "string"
      ? comment.trim()
      : "";


  if (
    normalizedComment.length >
    1000
  ) {

    const error =
      new Error(
        "Comment cannot exceed 1000 characters."
      );

    error.statusCode = 400;

    throw error;
  }


  try {

    const rating =
      await Rating.create({
        transaction:
          context.transaction._id,

        giver:
          giverId,

        receiver:
          context.receiver._id,

        equipment:
          context.transaction.equipment._id,

        equipmentConditionRating:
          condition,

        punctualityRating:
          punctuality,

        overallRating:
          overall,

        comment:
          normalizedComment
      });


    return await Rating.findById(
      rating._id
    )
      .populate(
        "giver",
        "name email role trustScore"
      )
      .populate(
        "receiver",
        "name email role trustScore"
      )
      .populate(
        "equipment",
        "name category"
      )
      .populate(
        "transaction",
        "status actualReturnDate"
      )
      .lean();

  } catch (error) {

    /*
     * MongoDB duplicate-key protection.
     */
    if (
      error &&
      error.code === 11000
    ) {

      const duplicateError =
        new Error(
          "You have already rated this transaction."
        );

      duplicateError.statusCode = 409;

      throw duplicateError;
    }

    throw error;

  }
}


/*
 * Get all ratings submitted by a user.
 */
async function getRatingsByGiver(
  userId
) {

  const normalizedUserId =
    normalizeObjectId(
      userId
    );


  if (!normalizedUserId) {

    const error =
      new Error(
        "Invalid user ID."
      );

    error.statusCode = 400;

    throw error;
  }


  return Rating.find({
    giver:
      normalizedUserId
  })
    .populate(
      "receiver",
      "name role trustScore"
    )
    .populate(
      "equipment",
      "name category"
    )
    .populate(
      "transaction",
      "status actualReturnDate"
    )
    .sort({
      createdAt: -1
    })
    .lean();

}


/*
 * Get ratings received by a user.
 */
async function getRatingsByReceiver(
  userId
) {

  const normalizedUserId =
    normalizeObjectId(
      userId
    );


  if (!normalizedUserId) {

    const error =
      new Error(
        "Invalid user ID."
      );

    error.statusCode = 400;

    throw error;
  }


  return Rating.find({
    receiver:
      normalizedUserId
  })
    .populate(
      "giver",
      "name role trustScore"
    )
    .populate(
      "equipment",
      "name category"
    )
    .populate(
      "transaction",
      "status actualReturnDate"
    )
    .sort({
      createdAt: -1
    })
    .lean();

}


/*
 * Get all ratings associated with one transaction.
 */
async function getTransactionRatings(
  transactionId
) {

  const normalizedTransactionId =
    normalizeObjectId(
      transactionId
    );


  if (!normalizedTransactionId) {

    const error =
      new Error(
        "Invalid transaction ID."
      );

    error.statusCode = 400;

    throw error;
  }


  return Rating.find({
    transaction:
      normalizedTransactionId
  })
    .populate(
      "giver",
      "name role trustScore"
    )
    .populate(
      "receiver",
      "name role trustScore"
    )
    .sort({
      createdAt: 1
    })
    .lean();

}


module.exports = {
  RATEABLE_TRANSACTION_STATUSES,
  getRatingContext,
  createRating,
  getRatingsByGiver,
  getRatingsByReceiver,
  getTransactionRatings
};
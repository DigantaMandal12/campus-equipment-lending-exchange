const mongoose = require("mongoose");

const connectDB =
  require("../config/db");

const Equipment =
  require("../models/Equipment");

const Transaction =
  require("../models/Transaction");

const {
  calculateTrustPoints,
  applyTrustPoints
} =
  require("./trustService");


const ACTIVE =
  "ACTIVE";

const OVERDUE =
  "OVERDUE";

const RETURN_REQUESTED =
  "RETURN_REQUESTED";

const RETURNED =
  "RETURNED";

const DEPOSIT_CONFIRMED =
  "DEPOSIT_CONFIRMED";

const REFUND_PENDING =
  "REFUND_PENDING";

const REFUNDED =
  "REFUNDED";

const DEPOSIT_REFUND_PENDING =
  "PENDING";

const DEPOSIT_REFUNDED =
  "REFUNDED";


const RETURN_CONDITIONS = [
  "GOOD",
  "MINOR_DAMAGE",
  "MAJOR_DAMAGE"
];


function validateObjectId(
  value,
  fieldName
) {

  if (
    !mongoose.Types.ObjectId.isValid(
      value
    )
  ) {

    const error =
      new Error(
        `Invalid ${fieldName}.`
      );

    error.statusCode =
      400;

    throw error;
  }

}


function createServiceError(
  message,
  statusCode = 400
) {

  const error =
    new Error(
      message
    );

  error.statusCode =
    statusCode;

  return error;
}


function normalizeReturnCondition(
  value
) {

  const condition =
    String(
      value || ""
    )
      .trim()
      .toUpperCase();


  if (
    !RETURN_CONDITIONS.includes(
      condition
    )
  ) {

    throw createServiceError(
      "Please select a valid returned condition.",
      400
    );

  }


  return condition;
}


function calculateLateDays(
  requestedReturnDate,
  actualReturnDate
) {

  const requested =
    new Date(
      requestedReturnDate
    ).getTime();

  const actual =
    new Date(
      actualReturnDate
    ).getTime();


  const difference =
    actual -
    requested;


  if (
    difference <= 0
  ) {

    return 0;

  }


  const millisecondsPerDay =
    24 *
    60 *
    60 *
    1000;


  return Math.ceil(
    difference /
    millisecondsPerDay
  );
}


/*
 * PHASE 5C
 *
 * Use the centralized Trust Score Engine.
 *
 * Rules are controlled by:
 *
 * config/trust.js
 *
 * Examples:
 *
 * GOOD + on-time       -> +2
 * Late                 -> -5 per late day
 * MINOR_DAMAGE         -> -10
 * MAJOR_DAMAGE         -> -25
 */
function calculateReturnTrustPoints(
  returnedCondition,
  lateDays
) {

  const damageSeverity =
    returnedCondition ===
    "MAJOR_DAMAGE"

      ? "MAJOR"

      : returnedCondition ===
        "MINOR_DAMAGE"

        ? "MINOR"

        : "NONE";


  const onTimeReturn =
    returnedCondition ===
      "GOOD" &&
    lateDays === 0;


  return calculateTrustPoints({
    onTimeReturn,

    latePenaltyUnits:
      lateDays,

    damageSeverity,

    seriousViolation:
      false
  });

}


async function getReturnDetails(
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
    await Transaction.findOne(
      {
        _id:
          transactionId,

        borrower:
          borrowerId
      }
    )
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


/*
 * ACTIVE / OVERDUE
 *
 *       ↓
 *
 * RETURN_REQUESTED
 */
async function requestReturn(
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


  const updatedTransaction =
    await Transaction.findOneAndUpdate(
      {
        _id:
          transactionId,

        borrower:
          borrowerId,

        status: {
          $in: [
            ACTIVE,
            OVERDUE
          ]
        },

        paymentStatus:
          DEPOSIT_CONFIRMED
      },

      {
        $set: {
          status:
            RETURN_REQUESTED
        }
      },

      {
        new:
          true,

        runValidators:
          true
      }
    )
      .populate(
        "equipment",
        "name category department quantity availableQuantity status"
      )
      .populate(
        "lender",
        "name email department year trustScore"
      );


  if (
    !updatedTransaction
  ) {

    throw createServiceError(
      "This borrowing cannot be returned from its current state.",
      409
    );

  }


  return updatedTransaction;
}


/*
 * LENDER CONFIRMS RETURN
 *
 * RETURN_REQUESTED
 *        ↓
 *     RETURNED
 *
 * PHASE 5C additions:
 *
 * 1. Calculate trust points.
 * 2. Update borrower.trustScore.
 * 3. Store trustPointsChange.
 *
 * Trust update and return update happen in
 * the SAME MongoDB transaction.
 */
async function confirmReturn(
  lenderId,
  transactionId,
  returnedCondition
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


  const normalizedCondition =
    normalizeReturnCondition(
      returnedCondition
    );


  const session =
    await mongoose.startSession();


  try {

    let completedTransaction =
      null;


    await session.withTransaction(
      async () => {

        /*
         * --------------------------------------------------
         * 1. LOAD RETURN REQUEST
         * --------------------------------------------------
         */

        const transaction =
          await Transaction.findOne(
            {
              _id:
                transactionId,

              lender:
                lenderId,

              status:
                RETURN_REQUESTED
            }
          )
            .session(
              session
            );


        if (!transaction) {

          throw createServiceError(
            "Return request was not found or is no longer awaiting lender confirmation.",
            409
          );

        }


        /*
         * --------------------------------------------------
         * 2. PAYMENT VALIDATION
         * --------------------------------------------------
         */

        if (
          transaction.paymentStatus !==
          DEPOSIT_CONFIRMED
        ) {

          throw createServiceError(
            "This transaction does not have a confirmed security deposit.",
            409
          );

        }


        /*
         * --------------------------------------------------
         * 3. QUANTITY VALIDATION
         * --------------------------------------------------
         */

        if (
          !Number.isInteger(
            transaction.quantity
          ) ||
          transaction.quantity <= 0
        ) {

          throw createServiceError(
            "Transaction quantity is invalid.",
            400
          );

        }


        /*
         * --------------------------------------------------
         * 4. LOAD EQUIPMENT
         * --------------------------------------------------
         */

        const equipment =
          await Equipment.findOne(
            {
              _id:
                transaction.equipment
            }
          )
            .session(
              session
            );


        if (!equipment) {

          throw createServiceError(
            "Equipment associated with this transaction was not found.",
            404
          );

        }


        /*
         * --------------------------------------------------
         * 5. OWNERSHIP CHECK
         * --------------------------------------------------
         */

        if (
          String(
            equipment.owner
          ) !==
          String(
            transaction.lender
          )
        ) {

          throw createServiceError(
            "Equipment ownership does not match the lender.",
            409
          );

        }


        /*
         * --------------------------------------------------
         * 6. RETURN TIMING
         * --------------------------------------------------
         */

        const actualReturnDate =
          new Date();


        const lateDays =
          calculateLateDays(
            transaction.requestedReturnDate,
            actualReturnDate
          );


        /*
         * --------------------------------------------------
         * 7. DAMAGE FLAG
         * --------------------------------------------------
         */

        const damageReported =
          normalizedCondition !==
          "GOOD";


        /*
         * --------------------------------------------------
         * 8. PHASE 5C TRUST CALCULATION
         * --------------------------------------------------
         */

        const trustPointsChange =
          calculateReturnTrustPoints(
            normalizedCondition,
            lateDays
          );


        /*
         * --------------------------------------------------
         * 9. PHASE 5C UPDATE BORROWER TRUST SCORE
         * --------------------------------------------------
         *
         * IMPORTANT:
         *
         * This uses the SAME MongoDB session.
         *
         * Therefore:
         *
         * trust update
         * +
         * inventory update
         * +
         * transaction update
         *
         * are atomic.
         *
         * If anything fails, everything rolls back.
         */

        const updatedBorrower =
          await applyTrustPoints({

            userId:
              transaction.borrower,

            pointsChange:
              trustPointsChange,

            session

          });


        /*
         * --------------------------------------------------
         * 10. RESTORE INVENTORY
         * --------------------------------------------------
         */

        const updatedEquipment =
          await Equipment.findOneAndUpdate(
            {
              _id:
                equipment._id,

              $expr: {
                $lte: [
                  {
                    $add: [
                      "$availableQuantity",
                      transaction.quantity
                    ]
                  },

                  "$quantity"
                ]
              }
            },

            {
              $inc: {
                availableQuantity:
                  transaction.quantity
              }
            },

            {
              new:
                true,

              session,

              runValidators:
                true
            }
          );


        if (
          !updatedEquipment
        ) {

          throw createServiceError(
            "Return could not be completed because inventory limits would be exceeded.",
            409
          );

        }


        /*
         * --------------------------------------------------
         * 11. UPDATE EQUIPMENT STATUS
         * --------------------------------------------------
         */

        await Equipment.updateOne(
          {
            _id:
              updatedEquipment._id
          },

          {
            $set: {
              status:
                updatedEquipment.availableQuantity >
                0

                  ? "AVAILABLE"

                  : "UNAVAILABLE"
            }
          },

          {
            session
          }
        );


        /*
         * --------------------------------------------------
         * 12. REFUND STATE
         * --------------------------------------------------
         */

        const refundStatus =
          transaction.securityDeposit >
          0

            ? DEPOSIT_REFUND_PENDING

            : "NOT_APPLICABLE";


        const nextPaymentStatus =
          transaction.securityDeposit >
          0

            ? REFUND_PENDING

            : REFUNDED;


        /*
         * --------------------------------------------------
         * 13. FINAL TRANSACTION UPDATE
         * --------------------------------------------------
         */

        const updatedTransaction =
          await Transaction.findOneAndUpdate(

            {
              _id:
                transaction._id,

              lender:
                lenderId,

              status:
                RETURN_REQUESTED
            },

            {
              $set: {

                status:
                  RETURNED,

                actualReturnDate,

                returnedCondition:
                  normalizedCondition,

                lateDays,

                damageReported,

                /*
                 * Store the POINTS AWARDED/DEDUCTED
                 * for this return event.
                 */
                trustPointsChange,

                paymentStatus:
                  nextPaymentStatus,

                depositRefundStatus:
                  refundStatus
              }
            },

            {
              new:
                true,

              session,

              runValidators:
                true
            }

          )
            .populate(
              "equipment",
              "name category department quantity availableQuantity status"
            )
            .populate(
              "borrower",
              "name email department year trustScore"
            )
            .populate(
              "lender",
              "name email department year trustScore"
            );


        if (
          !updatedTransaction
        ) {

          throw createServiceError(
            "Transaction changed before the return could be completed.",
            409
          );

        }


        /*
         * Make the returned object reflect the
         * new trust score.
         *
         * The actual database update has already
         * happened through applyTrustPoints().
         */
        if (
          updatedTransaction.borrower
        ) {

          updatedTransaction.borrower.trustScore =
            updatedBorrower.trustScore;

        }


        completedTransaction =
          updatedTransaction;

      }
    );


    return completedTransaction;

  } finally {

    await session.endSession();

  }
}


/*
 * MARK SECURITY DEPOSIT AS REFUNDED
 */
async function markDepositRefunded(
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


  const updatedTransaction =
    await Transaction.findOneAndUpdate(
      {
        _id:
          transactionId,

        lender:
          lenderId,

        status:
          RETURNED,

        paymentStatus:
          REFUND_PENDING,

        depositRefundStatus:
          DEPOSIT_REFUND_PENDING
      },

      {
        $set: {

          paymentStatus:
            REFUNDED,

          depositRefundStatus:
            DEPOSIT_REFUNDED
        }
      },

      {
        new:
          true,

        runValidators:
          true
      }
    )
      .populate(
        "equipment",
        "name category department quantity availableQuantity status"
      )
      .populate(
        "borrower",
        "name email department year trustScore"
      )
      .populate(
        "lender",
        "name email department year trustScore"
      );


  if (
    !updatedTransaction
  ) {

    throw createServiceError(
      "This deposit cannot be marked as refunded from its current state.",
      409
    );

  }


  return updatedTransaction;
}


/*
 * LENDER RETURN QUEUE
 */
async function getLenderReturnQueue(
  lenderId
) {

  await connectDB();


  validateObjectId(
    lenderId,
    "lender ID"
  );


  const transactions =
    await Transaction.find(
      {
        lender:
          lenderId,

        status: {
          $in: [
            ACTIVE,
            OVERDUE,
            RETURN_REQUESTED,
            RETURNED
          ]
        }
      }
    )
      .sort({
        updatedAt:
          -1
      })
      .populate(
        "equipment",
        "name category department condition images quantity availableQuantity status"
      )
      .populate(
        "borrower",
        "name email department year trustScore"
      )
      .populate(
        "lender",
        "name email department year trustScore"
      )
      .lean();


  return transactions;
}


module.exports = {
  getReturnDetails,
  requestReturn,
  confirmReturn,
  markDepositRefunded,
  getLenderReturnQueue
};
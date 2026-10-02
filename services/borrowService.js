const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Equipment = require("../models/Equipment");
const Transaction = require("../models/Transaction");

const ACTIVE_REQUEST_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "ACTIVE",
  "RETURN_REQUESTED",
  "OVERDUE"
];


/*
 * =====================================================
 * HELPERS
 * =====================================================
 */

function parsePositiveInteger(
  value,
  fieldName
) {
  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number < 1
  ) {
    throw new Error(
      `${fieldName} must be a whole number greater than 0.`
    );
  }

  return number;
}


function parseDateOnly(value) {
  const rawValue =
    String(value || "").trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      rawValue
    )
  ) {
    throw new Error(
      "Please select a valid return date."
    );
  }

  const parts =
    rawValue
      .split("-")
      .map(Number);

  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        12,
        0,
        0,
        0
      )
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      "Please select a valid return date."
    );
  }

  return date;
}


/*
 * =====================================================
 * CREATE BORROW REQUEST
 * =====================================================
 *
 * Important:
 *
 * Creating a request does NOT reduce inventory.
 *
 * Inventory will be handled during approval /
 * checkout in the next Phase 4 step.
 *
 * =====================================================
 */

async function createBorrowRequest(
  borrowerId,
  equipmentId,
  data
) {
  await connectDB();


  /*
   * Validate borrower ID.
   */

  if (
    !mongoose.Types.ObjectId.isValid(
      borrowerId
    )
  ) {
    throw new Error(
      "Invalid borrower account."
    );
  }


  /*
   * Validate equipment ID.
   */

  if (
    !mongoose.Types.ObjectId.isValid(
      equipmentId
    )
  ) {
    const error =
      new Error(
        "Invalid equipment ID."
      );

    error.statusCode = 400;

    throw error;
  }


  /*
   * Validate quantity.
   */

  const quantity =
    parsePositiveInteger(
      data.quantity,
      "Quantity"
    );


  /*
   * Validate requested return date.
   */

  const requestedReturnDate =
    parseDateOnly(
      data.requestedReturnDate
    );


  /*
   * Return date must be in the future.
   */

  if (
    requestedReturnDate.getTime() <=
    Date.now()
  ) {
    throw new Error(
      "Return date must be in the future."
    );
  }


  /*
   * IMPORTANT:
   *
   * Never trust equipment data coming from
   * the browser.
   *
   * Read it again from MongoDB.
   */

  const equipment =
    await Equipment.findById(
      equipmentId
    );


  if (!equipment) {
    const error =
      new Error(
        "Equipment not found."
      );

    error.statusCode = 404;

    throw error;
  }


  /*
   * Check availability.
   */

  if (
    equipment.status !==
      "AVAILABLE" ||
    equipment.availableQuantity < 1
  ) {
    throw new Error(
      "This equipment is currently unavailable."
    );
  }


  /*
   * Requested quantity cannot exceed
   * currently available quantity.
   */

  if (
    quantity >
    equipment.availableQuantity
  ) {
    throw new Error(
      `Only ${equipment.availableQuantity} item(s) are currently available.`
    );
  }


  /*
   * A lender cannot borrow their own item.
   */

  if (
    String(equipment.owner) ===
    String(borrowerId)
  ) {
    throw new Error(
      "You cannot borrow your own equipment."
    );
  }


  /*
   * Prevent duplicate active / pending
   * requests for the same borrower
   * and equipment.
   */

  const existingRequest =
    await Transaction.findOne({
      borrower: borrowerId,

      equipment: equipmentId,

      status: {
        $in:
          ACTIVE_REQUEST_STATUSES
      }
    });


  if (existingRequest) {
    throw new Error(
      "You already have an active or pending request for this equipment."
    );
  }


  /*
   * Create transaction.
   */

  const transaction =
    await Transaction.create({
      borrower:
        borrowerId,

      lender:
        equipment.owner,

      equipment:
        equipment._id,

      quantity,

      requestDate:
        new Date(),

      requestedReturnDate,

      status:
        "PENDING_APPROVAL",

      /*
       * Snapshot financial values at
       * request creation time.
       */

      rentalFee:
        equipment.rentalFee,

      securityDeposit:
        equipment.securityDeposit,

      paymentStatus:
        "NOT_STARTED",

      depositRefundStatus:
        equipment.securityDeposit > 0
          ? "PENDING"
          : "NOT_APPLICABLE"
    });


  return transaction;
}


/*
 * =====================================================
 * GET BORROWER REQUESTS
 * =====================================================
 */

async function getMyBorrowRequests(
  borrowerId
) {
  await connectDB();


  if (
    !mongoose.Types.ObjectId.isValid(
      borrowerId
    )
  ) {
    throw new Error(
      "Invalid borrower account."
    );
  }


  return Transaction.find({
    borrower: borrowerId
  })
    .populate(
      "equipment",
      [
        "name",
        "category",
        "department",
        "images",
        "quantity",
        "availableQuantity",
        "status"
      ].join(" ")
    )
    .populate(
      "lender",
      [
        "name",
        "email",
        "department",
        "trustScore"
      ].join(" ")
    )
    .sort({
      createdAt: -1
    })
    .lean();
}


/*
 * =====================================================
 * EXPORTS
 * =====================================================
 */

module.exports = {
  createBorrowRequest,
  getMyBorrowRequests
};
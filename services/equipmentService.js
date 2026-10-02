const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Equipment = require("../models/Equipment");

const ALLOWED_CONDITIONS = [
  "NEW",
  "LIKE_NEW",
  "GOOD",
  "FAIR",
  "NEEDS_REPAIR"
];

function normalizeText(value) {
  return String(value || "").trim();
}

function parseNonNegativeNumber(value, fieldName) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(
      `${fieldName} must be a valid number.`
    );
  }

  if (number < 0) {
    throw new Error(
      `${fieldName} cannot be negative.`
    );
  }

  return number;
}

function parsePositiveInteger(value, fieldName) {
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

function validateEquipmentData(data) {
  const name = normalizeText(data.name);

  const description =
    normalizeText(data.description);

  const category =
    normalizeText(data.category);

  const department =
    normalizeText(data.department);

  const condition =
    normalizeText(data.condition).toUpperCase();

  if (name.length < 2) {
    throw new Error(
      "Equipment name must contain at least 2 characters."
    );
  }

  if (description.length < 10) {
    throw new Error(
      "Equipment description must contain at least 10 characters."
    );
  }

  if (!category) {
    throw new Error(
      "Equipment category is required."
    );
  }

  if (!department) {
    throw new Error(
      "Engineering department is required."
    );
  }

  if (
    !ALLOWED_CONDITIONS.includes(condition)
  ) {
    throw new Error(
      "Invalid equipment condition."
    );
  }

  const quantity =
    parsePositiveInteger(
      data.quantity,
      "Quantity"
    );

  const rentalFee =
    parseNonNegativeNumber(
      data.rentalFee,
      "Rental fee"
    );

  const securityDeposit =
    parseNonNegativeNumber(
      data.securityDeposit,
      "Security deposit"
    );

  return {
    name,
    description,
    category,
    department,
    condition,
    quantity,
    rentalFee,
    securityDeposit,
    borrowingTerms:
      normalizeText(data.borrowingTerms)
  };
}

/**
 * Normalize uploaded image paths.
 *
 * The controller creates these paths from Multer filenames,
 * for example:
 *
 * /uploads/equipment/abc123.jpg
 */
function normalizeImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => normalizeText(image))
    .filter(Boolean);
}

/**
 * Create new equipment.
 */
async function createEquipment(ownerId, data) {
  await connectDB();

  if (
    !mongoose.Types.ObjectId.isValid(ownerId)
  ) {
    throw new Error(
      "Invalid lender account."
    );
  }

  const equipmentData =
    validateEquipmentData(data);

  const images =
    normalizeImages(data.images);

  const equipment =
    await Equipment.create({
      owner: ownerId,

      ...equipmentData,

      images,

      availableQuantity:
        equipmentData.quantity,

      status: "AVAILABLE"
    });

  return equipment;
}

/**
 * Get one equipment item by ID.
 */
async function getEquipmentById(equipmentId) {
  await connectDB();

  if (
    !mongoose.Types.ObjectId.isValid(
      equipmentId
    )
  ) {
    const error = new Error(
      "Invalid equipment ID."
    );

    error.statusCode = 400;

    throw error;
  }

  const equipment =
    await Equipment.findById(equipmentId)
      .populate(
        "owner",
        "name email department year trustScore"
      )
      .lean();

  if (!equipment) {
    const error = new Error(
      "Equipment not found."
    );

    error.statusCode = 404;

    throw error;
  }

  return equipment;
}

/**
 * Get all currently available equipment.
 */
async function getAvailableEquipment() {
  await connectDB();

  return Equipment.find({
    status: "AVAILABLE",

    availableQuantity: {
      $gt: 0
    }
  })
    .populate(
      "owner",
      "name department trustScore"
    )
    .sort({
      createdAt: -1
    })
    .lean();
}

/**
 * Get all equipment owned by a lender.
 */
async function getMyEquipment(ownerId) {
  await connectDB();

  if (
    !mongoose.Types.ObjectId.isValid(ownerId)
  ) {
    throw new Error(
      "Invalid lender account."
    );
  }

  return Equipment.find({
    owner: ownerId
  })
    .sort({
      createdAt: -1
    })
    .lean();
}

/**
 * Get one equipment item only if the lender owns it.
 *
 * Ownership protection:
 * _id + owner
 */
async function getMyEquipmentById(
  ownerId,
  equipmentId
) {
  await connectDB();

  if (
    !mongoose.Types.ObjectId.isValid(ownerId)
  ) {
    throw new Error(
      "Invalid lender account."
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      equipmentId
    )
  ) {
    const error = new Error(
      "Invalid equipment ID."
    );

    error.statusCode = 400;

    throw error;
  }

  const equipment =
    await Equipment.findOne({
      _id: equipmentId,
      owner: ownerId
    }).lean();

  if (!equipment) {
    const error = new Error(
      "Equipment not found or you do not own it."
    );

    error.statusCode = 404;

    throw error;
  }

  return equipment;
}

/**
 * Update lender-owned equipment.
 *
 * Inventory rule:
 *
 * quantity = total physical items
 * availableQuantity = items currently available
 *
 * reserved/unavailable quantity:
 * quantity - availableQuantity
 *
 * Example:
 *
 * quantity = 5
 * availableQuantity = 3
 *
 * reserved/unavailable = 2
 *
 * If quantity changes to 4:
 *
 * availableQuantity = 4 - 2 = 2
 */
async function updateMyEquipment(
  ownerId,
  equipmentId,
  data
) {
  await connectDB();

  if (
    !mongoose.Types.ObjectId.isValid(ownerId)
  ) {
    throw new Error(
      "Invalid lender account."
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      equipmentId
    )
  ) {
    const error = new Error(
      "Invalid equipment ID."
    );

    error.statusCode = 400;

    throw error;
  }

  const existingEquipment =
    await Equipment.findOne({
      _id: equipmentId,
      owner: ownerId
    });

  if (!existingEquipment) {
    const error = new Error(
      "Equipment not found or you do not own it."
    );

    error.statusCode = 404;

    throw error;
  }

  const validated =
    validateEquipmentData(data);

  const reservedQuantity =
    existingEquipment.quantity -
    existingEquipment.availableQuantity;

  if (
    validated.quantity <
    reservedQuantity
  ) {
    throw new Error(
      `Quantity cannot be reduced below ${reservedQuantity} because ${reservedQuantity} item(s) are currently unavailable.`
    );
  }

  const newAvailableQuantity =
    validated.quantity -
    reservedQuantity;

  existingEquipment.name =
    validated.name;

  existingEquipment.description =
    validated.description;

  existingEquipment.category =
    validated.category;

  existingEquipment.department =
    validated.department;

  existingEquipment.condition =
    validated.condition;

  existingEquipment.quantity =
    validated.quantity;

  existingEquipment.availableQuantity =
    newAvailableQuantity;

  existingEquipment.rentalFee =
    validated.rentalFee;

  existingEquipment.securityDeposit =
    validated.securityDeposit;

  existingEquipment.borrowingTerms =
    validated.borrowingTerms;

  /**
   * Image handling:
   *
   * No new images:
   * keep existing images.
   *
   * New images:
   * append them to existing images.
   */
  const newImages =
    normalizeImages(data.images);

  if (newImages.length > 0) {
    const existingImages =
      Array.isArray(
        existingEquipment.images
      )
        ? existingEquipment.images
        : [];

    existingEquipment.images = [
      ...existingImages,
      ...newImages
    ];
  }

  existingEquipment.status =
    newAvailableQuantity > 0
      ? "AVAILABLE"
      : "UNAVAILABLE";

  await existingEquipment.save();

  return existingEquipment;
}

/**
 * Delete lender-owned equipment.
 */
async function deleteMyEquipment(
  ownerId,
  equipmentId
) {
  await connectDB();

  if (
    !mongoose.Types.ObjectId.isValid(ownerId)
  ) {
    throw new Error(
      "Invalid lender account."
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      equipmentId
    )
  ) {
    const error = new Error(
      "Invalid equipment ID."
    );

    error.statusCode = 400;

    throw error;
  }

  const equipment =
    await Equipment.findOne({
      _id: equipmentId,
      owner: ownerId
    });

  if (!equipment) {
    const error = new Error(
      "Equipment not found or you do not own it."
    );

    error.statusCode = 404;

    throw error;
  }

  /*
   * There is no Transaction model yet because
   * borrowing belongs to Phase 4.
   *
   * Once transactions exist, deletion should
   * additionally check for active transactions.
   */

  await Equipment.deleteOne({
    _id: equipmentId,
    owner: ownerId
  });

  return true;
}

module.exports = {
  createEquipment,
  getEquipmentById,
  getAvailableEquipment,
  getMyEquipment,
  getMyEquipmentById,
  updateMyEquipment,
  deleteMyEquipment
};
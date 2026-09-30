const express = require("express");

const {
  renderCreateEquipment,
  create,
  browse,
  mine,
  details,
  renderEditEquipment,
  update,
  remove
} = require("../controllers/equipmentController");

const {
  requireAuth
} = require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/roleMiddleware");

const {
  uploadEquipmentImages
} = require("../middleware/uploadMiddleware");

const router =
  express.Router();

// -----------------------------------------------
// Create
// -----------------------------------------------

router.get(
  "/new",
  requireAuth,
  requireRole("LENDER"),
  renderCreateEquipment
);

router.post(
  "/",
  requireAuth,
  requireRole("LENDER"),
  uploadEquipmentImages.array(
    "images",
    5
  ),
  create
);

// -----------------------------------------------
// Owner equipment
// -----------------------------------------------

router.get(
  "/mine",
  requireAuth,
  requireRole("LENDER"),
  mine
);

// -----------------------------------------------
// Edit
// -----------------------------------------------

router.get(
  "/:id/edit",
  requireAuth,
  requireRole("LENDER"),
  renderEditEquipment
);

router.post(
  "/:id/update",
  requireAuth,
  requireRole("LENDER"),
  uploadEquipmentImages.array(
    "images",
    5
  ),
  update
);

// -----------------------------------------------
// Delete
// -----------------------------------------------

router.post(
  "/:id/delete",
  requireAuth,
  requireRole("LENDER"),
  remove
);

// -----------------------------------------------
// Browse Equipment
// -----------------------------------------------

router.get(
  "/",
  requireAuth,
  browse
);

// -----------------------------------------------
// Equipment Details
// IMPORTANT:
// Keep this after /new, /mine and /:id/edit.
// -----------------------------------------------

router.get(
  "/:id",
  requireAuth,
  details
);

module.exports = router;
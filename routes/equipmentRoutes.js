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
// Publicly browsable authenticated inventory
// -----------------------------------------------

router.get(
  "/",
  requireAuth,
  browse
);

// -----------------------------------------------
// Details
// IMPORTANT: keep this after /new, /mine and
// /:id/edit so those paths are not interpreted
// as IDs.
// -----------------------------------------------

router.get(
  "/:id",
  requireAuth,
  details
);

module.exports = router;
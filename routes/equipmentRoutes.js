"use strict";

const express = require("express");

const {
  renderCreateEquipment,
  create,
  browse,
  mine,
  details,
  renderEditEquipment,
  update,
  remove,
} = require("../controllers/equipmentController");

const {
  requireAuth,
} = require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/roleMiddleware");

const {
  uploadEquipmentImages,
} = require("../middleware/uploadMiddleware");

const router = express.Router();


/* =========================================================
   CREATE EQUIPMENT
   ========================================================= */

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


/* =========================================================
   MY EQUIPMENT
   IMPORTANT:
   Keep this BEFORE /:id
   ========================================================= */

router.get(
  "/mine",
  requireAuth,
  requireRole("LENDER"),
  mine
);


/* =========================================================
   EDIT EQUIPMENT
   IMPORTANT:
   Keep this BEFORE /:id
   ========================================================= */

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


/* =========================================================
   DELETE EQUIPMENT
   ========================================================= */

router.post(
  "/:id/delete",
  requireAuth,
  requireRole("LENDER"),
  remove
);


/* =========================================================
   BROWSE EQUIPMENT
   ========================================================= */

router.get(
  "/",
  requireAuth,
  browse
);


/* =========================================================
   EQUIPMENT DETAILS
   IMPORTANT:
   This MUST be the LAST GET route.
   ========================================================= */

router.get(
  "/:id",
  requireAuth,
  details
);


module.exports = router;
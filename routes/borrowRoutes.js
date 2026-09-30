const express = require("express");

const {
  renderBorrowRequest,
  createRequest,
  myRequests
} = require("../controllers/borrowController");

const {
  requireAuth
} = require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/roleMiddleware");

const router = express.Router();

/*
 * ================================
 * BORROW REQUEST PAGE
 * ================================
 */
router.get(
  "/request/:equipmentId",
  requireAuth,
  requireRole("BORROWER"),
  renderBorrowRequest
);


/*
 * ================================
 * CREATE BORROW REQUEST
 * ================================
 */
router.post(
  "/request/:equipmentId",
  requireAuth,
  requireRole("BORROWER"),
  createRequest
);


/*
 * ================================
 * MY BORROW REQUESTS
 * ================================
 */
router.get(
  "/my-requests",
  requireAuth,
  requireRole("BORROWER"),
  myRequests
);


/*
 * ================================
 * BORROWER DEFAULT PAGE
 * ================================
 */
router.get(
  "/",
  requireAuth,
  requireRole("BORROWER"),
  myRequests
);


/*
 * IMPORTANT:
 * Export the Express router itself.
 */
module.exports = router;
const express = require("express");

const {
  renderReturn,
  requestReturn,
  renderLenderReturns,
  confirmReturn,
  markDepositRefunded
} = require("../controllers/returnController");

const {
  requireAuth
} = require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/roleMiddleware");

const router =
  express.Router();


// ==================================================
// LENDER RETURN MANAGEMENT
// IMPORTANT:
// These routes MUST come before /:transactionId
// ==================================================

router.get(
  "/lender",
  requireAuth,
  requireRole("LENDER"),
  renderLenderReturns
);


router.post(
  "/lender/:transactionId/confirm",
  requireAuth,
  requireRole("LENDER"),
  confirmReturn
);


router.post(
  "/lender/:transactionId/refund",
  requireAuth,
  requireRole("LENDER"),
  markDepositRefunded
);


// ==================================================
// BORROWER RETURN FLOW
// ==================================================

router.get(
  "/:transactionId",
  requireAuth,
  requireRole("BORROWER"),
  renderReturn
);


router.post(
  "/:transactionId",
  requireAuth,
  requireRole("BORROWER"),
  requestReturn
);


module.exports = router;
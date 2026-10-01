const express = require("express");

const {
  requests,
  approve,
  reject,
  verifyPayment,
  rejectPayment
} = require("../controllers/lenderController");

const {
  requireAuth
} = require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/roleMiddleware");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("LENDER"));

router.get(
  "/",
  requests
);

router.get(
  "/requests",
  requests
);

router.post(
  "/requests/:transactionId/approve",
  approve
);

router.post(
  "/requests/:transactionId/reject",
  reject
);

router.post(
  "/requests/:transactionId/verify-payment",
  verifyPayment
);

router.post(
  "/requests/:transactionId/reject-payment",
  rejectPayment
);

module.exports = router;
const express = require("express");

const {
  renderPayment,
  submitPayment
} = require("../controllers/paymentController");

const {
  requireAuth
} = require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/roleMiddleware");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("BORROWER"));

router.get(
  "/:transactionId",
  renderPayment
);

router.post(
  "/:transactionId",
  submitPayment
);

module.exports = router;
const express = require("express");

const {
  renderCheckout,
  checkout
} = require("../controllers/checkoutController");

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
  renderCheckout
);

router.post(
  "/:transactionId",
  checkout
);

module.exports = router;
const express = require("express");

const {
  showDashboardRouter,
  adminDashboard,
  lenderDashboard,
  borrowerDashboard
} = require("../controllers/dashboardController");

const {
  requireAuth
} = require("../middleware/authMiddleware");

const requireRole =
  require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  showDashboardRouter
);

router.get(
  "/admin",
  requireAuth,
  requireRole("ADMIN"),
  adminDashboard
);

router.get(
  "/lender",
  requireAuth,
  requireRole("LENDER"),
  lenderDashboard
);

router.get(
  "/borrower",
  requireAuth,
  requireRole("BORROWER"),
  borrowerDashboard
);

module.exports = router;
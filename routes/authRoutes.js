const express = require("express");

const {
  renderRegister,
  register,
  renderLogin,
  login,
  renderVerifyEmail,
  verifyEmail,
  resendOtp,
  logout
} = require("../controllers/authController");

const {
  requireGuest
} = require("../middleware/authMiddleware");

const router =
  express.Router();

router.get(
  "/register",
  requireGuest,
  renderRegister
);

router.post(
  "/register",
  requireGuest,
  register
);

router.get(
  "/login",
  requireGuest,
  renderLogin
);

router.post(
  "/login",
  requireGuest,
  login
);

router.get(
  "/verify-email",
  requireGuest,
  renderVerifyEmail
);

router.post(
  "/verify-email",
  requireGuest,
  verifyEmail
);

router.post(
  "/resend-otp",
  requireGuest,
  resendOtp
);

router.post(
  "/logout",
  logout
);

module.exports = router;
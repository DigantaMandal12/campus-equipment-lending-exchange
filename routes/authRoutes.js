const express = require("express");

const {
  renderRegister,
  register,
  renderLogin,
  login,
  renderVerifyEmail,
  verifyEmail,
  resendOtp,
  logout,
} = require("../controllers/authController");

const {
  requireGuest,
} = require("../middleware/authMiddleware");

const router = express.Router();

/* =========================================================
   REGISTRATION
   ========================================================= */

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


/* =========================================================
   SIGNUP ALIAS
   /auth/signup -> /auth/register
   ========================================================= */

router.get(
  "/signup",
  requireGuest,
  (req, res) => {
    return res.redirect("/auth/register");
  }
);


/* =========================================================
   LOGIN
   ========================================================= */

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


/* =========================================================
   EMAIL VERIFICATION / OTP
   ========================================================= */

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


/* =========================================================
   LOGOUT
   ========================================================= */

router.post(
  "/logout",
  logout
);


/* =========================================================
   EXPORT
   ========================================================= */

module.exports = router;
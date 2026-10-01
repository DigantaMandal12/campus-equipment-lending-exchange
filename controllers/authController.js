"use strict";

const {
  registerUser,
  loginUser,
  sendOtpForUser,
  verifyUserOtp,
  getUserForVerification,
} = require("../services/authService");


/* =========================================================
   RENDER REGISTER
   ========================================================= */

function renderRegister(req, res) {
  return res.render("auth/register", {
    title: "Register",

    error: req.query.error || null,

    message: req.query.message || null,

    formData: {
      name: "",
      email: "",
      department: "",
      year: "",
      phone: "",
      role: "BORROWER",
    },
  });
}


/* =========================================================
   REGISTER
   ========================================================= */

async function register(req, res) {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      role,
      department,
      year,
      phone,
    } = req.body;


    /* -----------------------------------------------------
       REQUIRED FIELD VALIDATION
       ----------------------------------------------------- */

    if (
      !name ||
      !email ||
      !password ||
      !confirmPassword ||
      !role ||
      !department ||
      !year
    ) {
      throw new Error(
        "Please fill in all required fields."
      );
    }


    /* -----------------------------------------------------
       PASSWORD MATCH
       ----------------------------------------------------- */

    if (password !== confirmPassword) {
      throw new Error(
        "Passwords do not match."
      );
    }


    /* -----------------------------------------------------
       PASSWORD LENGTH
       ----------------------------------------------------- */

    if (password.length < 8) {
      throw new Error(
        "Password must contain at least 8 characters."
      );
    }


    /* -----------------------------------------------------
       ROLE VALIDATION
       ----------------------------------------------------- */

    const normalizedRole =
      String(role)
        .trim()
        .toUpperCase();

    const allowedRoles = [
      "BORROWER",
      "LENDER",
    ];

    if (!allowedRoles.includes(normalizedRole)) {
      throw new Error(
        "Invalid account type."
      );
    }


    /* -----------------------------------------------------
       CREATE USER
       ----------------------------------------------------- */

    const user = await registerUser({
      name: String(name).trim(),

      email: String(email)
        .trim()
        .toLowerCase(),

      password,

      role: normalizedRole,

      department:
        String(department).trim(),

      year:
        String(year).trim(),

      phone:
        phone
          ? String(phone).trim()
          : "",
    });


    /* -----------------------------------------------------
       STORE PENDING VERIFICATION USER
       ----------------------------------------------------- */

    req.session.pendingVerificationUserId =
      user._id.toString();


    /* -----------------------------------------------------
       SEND OTP
       ----------------------------------------------------- */

    await sendOtpForUser(
      user._id.toString()
    );


    /* -----------------------------------------------------
       REDIRECT TO OTP PAGE
       ----------------------------------------------------- */

    return res.redirect(
      "/auth/verify-email?message=OTP+sent+to+your+institutional+email."
    );

  } catch (error) {

    console.error(
      "Registration error:",
      error
    );

    return res.status(400).render(
      "auth/register",
      {
        title: "Register",

        error:
          error.message ||
          "Unable to complete registration.",

        message: null,

        formData: {
          name:
            req.body.name || "",

          email:
            req.body.email || "",

          department:
            req.body.department || "",

          year:
            req.body.year || "",

          phone:
            req.body.phone || "",

          role:
            req.body.role ||
            "BORROWER",
        },
      }
    );
  }
}


/* =========================================================
   RENDER LOGIN
   ========================================================= */

function renderLogin(req, res) {
  return res.render("auth/login", {
    title: "Login",

    error:
      req.query.error || null,

    message:
      req.query.message || null,
  });
}


/* =========================================================
   LOGIN
   ========================================================= */

async function login(req, res) {
  try {

    const {
      email,
      password,
    } = req.body;


    /* -----------------------------------------------------
       REQUIRED FIELDS
       ----------------------------------------------------- */

    if (!email || !password) {
      throw new Error(
        "Email and password are required."
      );
    }


    /* -----------------------------------------------------
       AUTHENTICATE
       ----------------------------------------------------- */

    const user =
      await loginUser(
        String(email)
          .trim()
          .toLowerCase(),

        password
      );


    /* -----------------------------------------------------
       ROLE-BASED DASHBOARD
       ----------------------------------------------------- */

    const redirectPath =
      getAuthenticatedRedirect(
        user,
        "Login successful"
      );


    /* -----------------------------------------------------
       SECURE SESSION REGENERATION
       ----------------------------------------------------- */

    return regenerateAuthenticatedSession(
      req,
      res,
      user,
      redirectPath
    );

  } catch (error) {

    console.error(
      "Login error:",
      error
    );


    /* -----------------------------------------------------
       EMAIL NOT VERIFIED
       ----------------------------------------------------- */

    if (
      error.code ===
      "EMAIL_NOT_VERIFIED"
    ) {

      req.session.pendingVerificationUserId =
        error.userId;

      return res.redirect(
        "/auth/verify-email?error=Please+verify+your+email+before+logging+in."
      );
    }


    /* -----------------------------------------------------
       LOGIN FAILURE
       ----------------------------------------------------- */

    return res.status(401).render(
      "auth/login",
      {
        title: "Login",

        error:
          error.message ||
          "Unable to login.",

        message: null,
      }
    );
  }
}


/* =========================================================
   RENDER VERIFY EMAIL
   ========================================================= */

async function renderVerifyEmail(req, res) {
  const userId =
    req.session
      .pendingVerificationUserId;


  /* -------------------------------------------------------
     VERIFICATION SESSION CHECK
     ------------------------------------------------------- */

  if (!userId) {
    return res.redirect(
      "/auth/login?error=Please+register+or+login+first."
    );
  }


  try {

    const user =
      await getUserForVerification(
        userId
      );


    /* -----------------------------------------------------
       ALREADY VERIFIED
       ----------------------------------------------------- */

    if (user.isEmailVerified) {

      return res.redirect(
        "/auth/login?message=Your+email+is+already+verified."
      );
    }


    /* -----------------------------------------------------
       RENDER OTP PAGE
       ----------------------------------------------------- */

    return res.render(
      "auth/verify-email",
      {
        title: "Verify Email",

        error:
          req.query.error || null,

        message:
          req.query.message || null,

        email:
          user.email,
      }
    );

  } catch (error) {

    console.error(
      "Render verification error:",
      error
    );


    req.session.pendingVerificationUserId =
      null;


    return res.redirect(
      `/auth/login?error=${encodeURIComponent(
        error.message ||
        "Verification session is invalid."
      )}`
    );
  }
}


/* =========================================================
   VERIFY EMAIL
   ========================================================= */

async function verifyEmail(req, res) {
  const userId =
    req.session
      .pendingVerificationUserId;


  /* -------------------------------------------------------
     SESSION CHECK
     ------------------------------------------------------- */

  if (!userId) {
    return res.redirect(
      "/auth/login?error=Verification+session+expired."
    );
  }


  const otp =
    String(
      req.body.otp || ""
    ).trim();


  /* -------------------------------------------------------
     OTP FORMAT
     ------------------------------------------------------- */

  if (!/^\d{6}$/.test(otp)) {

    return res.redirect(
      "/auth/verify-email?error=Enter+the+6-digit+OTP."
    );
  }


  try {

    /* -----------------------------------------------------
       VERIFY OTP
       ----------------------------------------------------- */

    const user =
      await verifyUserOtp(
        userId,
        otp
      );


    /* -----------------------------------------------------
       ROLE-BASED DASHBOARD
       ----------------------------------------------------- */

    const redirectPath =
      getAuthenticatedRedirect(
        user,
        "Email verified successfully"
      );


    /* -----------------------------------------------------
       REGENERATE AUTHENTICATED SESSION
       ----------------------------------------------------- */

    return regenerateAuthenticatedSession(
      req,
      res,
      user,
      redirectPath
    );

  } catch (error) {

    console.error(
      "Email verification error:",
      error
    );


    return res.redirect(
      `/auth/verify-email?error=${encodeURIComponent(
        error.message ||
        "Unable to verify email."
      )}`
    );
  }
}


/* =========================================================
   RESEND OTP
   ========================================================= */

async function resendOtp(req, res) {
  const userId =
    req.session
      .pendingVerificationUserId;


  /* -------------------------------------------------------
     SESSION CHECK
     ------------------------------------------------------- */

  if (!userId) {

    return res.redirect(
      "/auth/login?error=Verification+session+expired."
    );
  }


  try {

    await sendOtpForUser(
      userId
    );


    return res.redirect(
      "/auth/verify-email?message=New+OTP+sent+successfully."
    );

  } catch (error) {

    console.error(
      "Resend OTP error:",
      error
    );


    return res.redirect(
      `/auth/verify-email?error=${encodeURIComponent(
        error.message ||
        "Unable to resend OTP."
      )}`
    );
  }
}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout(req, res) {

  req.session.destroy(
    (error) => {

      if (error) {

        console.error(
          "Logout error:",
          error
        );


        return res
          .status(500)
          .render(
            "errors/500",
            {
              title:
                "Logout Error",

              message:
                "Unable to logout safely.",
            }
          );
      }


      /* ---------------------------------------------------
         CLEAR SESSION COOKIE
         --------------------------------------------------- */

      res.clearCookie(
        "connect.sid"
      );


      /* ---------------------------------------------------
         LOGIN PAGE
         --------------------------------------------------- */

      return res.redirect(
        "/auth/login?message=You+have+been+logged+out."
      );
    }
  );
}


/* =========================================================
   ROLE-BASED DASHBOARD REDIRECT
   ========================================================= */

function getAuthenticatedRedirect(
  user,
  message
) {

  const role =
    String(
      user?.role || ""
    )
      .trim()
      .toUpperCase();


  let dashboardPath =
    "/dashboard";


  switch (role) {

    case "BORROWER":

      dashboardPath =
        "/dashboard/borrower";

      break;


    case "LENDER":

      dashboardPath =
        "/dashboard/lender";

      break;


    case "ADMIN":

      dashboardPath =
        "/admin";

      break;


    default:

      dashboardPath =
        "/dashboard";
  }


  const query =
    encodeURIComponent(
      message
    );


  return `${dashboardPath}?message=${query}`;
}


/* =========================================================
   SECURE AUTHENTICATED SESSION
   ========================================================= */

function regenerateAuthenticatedSession(
  req,
  res,
  user,
  redirectPath
) {

  return new Promise(
    (resolve) => {

      req.session.regenerate(
        (sessionError) => {

          if (sessionError) {

            console.error(
              "Session regeneration error:",
              sessionError
            );


            res
              .status(500)
              .render(
                "errors/500",
                {
                  title:
                    "Authentication Error",

                  message:
                    "Unable to create a secure session.",
                }
              );


            return resolve();
          }


          /* -----------------------------------------------
             STORE AUTHENTICATED USER
             ----------------------------------------------- */

          req.session.user =
            user;


          /* -----------------------------------------------
             SAVE SESSION
             ----------------------------------------------- */

          req.session.save(
            (saveError) => {

              if (saveError) {

                console.error(
                  "Session save error:",
                  saveError
                );


                res
                  .status(500)
                  .render(
                    "errors/500",
                    {
                      title:
                        "Authentication Error",

                      message:
                        "Unable to save your session.",
                    }
                  );


                return resolve();
              }


              /* ---------------------------------------------
                 FINAL REDIRECT
                 --------------------------------------------- */

              return res.redirect(
                redirectPath
              );
            }
          );
        }
      );
    }
  );
}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  renderRegister,
  register,
  renderLogin,
  login,
  renderVerifyEmail,
  verifyEmail,
  resendOtp,
  logout,
};
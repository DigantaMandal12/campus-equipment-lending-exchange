const {
  registerUser,
  loginUser,
  sendOtpForUser,
  verifyUserOtp,
  getUserForVerification
} = require("../services/authService");

function renderRegister(req, res) {
  res.render("auth/register", {
    title: "Register",
    error:
      req.query.error || null,
    formData: {
      name: "",
      email: "",
      department: "",
      year: "",
      phone: "",
      role: "BORROWER"
    }
  });
}

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
      phone
    } = req.body;

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

    if (password !== confirmPassword) {
      throw new Error(
        "Passwords do not match."
      );
    }

    if (password.length < 8) {
      throw new Error(
        "Password must contain at least 8 characters."
      );
    }

    const user =
      await registerUser({
        name,
        email,
        password,
        role,
        department,
        year,
        phone
      });

    req.session.pendingVerificationUserId =
      user._id.toString();

    await sendOtpForUser(
      user._id.toString()
    );

    return res.redirect(
      "/auth/verify-email?message=OTP+sent+to+your+institutional+email."
    );
  } catch (error) {
    return res.status(400).render(
      "auth/register",
      {
        title: "Register",
        error: error.message,
        formData: {
          name: req.body.name || "",
          email: req.body.email || "",
          department:
            req.body.department || "",
          year:
            req.body.year || "",
          phone:
            req.body.phone || "",
          role:
            req.body.role ||
            "BORROWER"
        }
      }
    );
  }
}

function renderLogin(req, res) {
  res.render("auth/login", {
    title: "Login",
    error:
      req.query.error || null,
    message:
      req.query.message || null
  });
}

async function login(req, res) {
  try {
    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      throw new Error(
        "Email and password are required."
      );
    }

    const user =
      await loginUser(
        email,
        password
      );

    await regenerateAuthenticatedSession(
      req,
      res,
      user,
      "/?message=Login+successful"
    );
  } catch (error) {
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

    return res.status(401).render(
      "auth/login",
      {
        title: "Login",
        error:
          error.message,
        message: null
      }
    );
  }
}

async function renderVerifyEmail(
  req,
  res
) {
  const userId =
    req.session.pendingVerificationUserId;

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

    if (user.isEmailVerified) {
      return res.redirect(
        "/auth/login?message=Your+email+is+already+verified."
      );
    }

    return res.render(
      "auth/verify-email",
      {
        title: "Verify Email",
        error:
          req.query.error || null,
        message:
          req.query.message || null,
        email: user.email
      }
    );
  } catch (error) {
    req.session.pendingVerificationUserId =
      null;

    return res.redirect(
      `/auth/login?error=${encodeURIComponent(error.message)}`
    );
  }
}

async function verifyEmail(
  req,
  res
) {
  const userId =
    req.session.pendingVerificationUserId;

  if (!userId) {
    return res.redirect(
      "/auth/login?error=Verification+session+expired."
    );
  }

  const otp =
    String(
      req.body.otp || ""
    ).trim();

  if (!/^\d{6}$/.test(otp)) {
    return res.redirect(
      "/auth/verify-email?error=Enter+the+6-digit+OTP."
    );
  }

  try {
    const user =
      await verifyUserOtp(
        userId,
        otp
      );

    req.session.pendingVerificationUserId =
      null;

    await regenerateAuthenticatedSession(
      req,
      res,
      user,
      "/?message=Email+verified+successfully"
    );
  } catch (error) {
    return res.redirect(
      `/auth/verify-email?error=${encodeURIComponent(error.message)}`
    );
  }
}

async function resendOtp(
  req,
  res
) {
  const userId =
    req.session.pendingVerificationUserId;

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
    return res.redirect(
      `/auth/verify-email?error=${encodeURIComponent(error.message)}`
    );
  }
}

function logout(req, res) {
  req.session.destroy(
    (error) => {
      if (error) {
        console.error(
          "Logout error:",
          error
        );

        return res.status(500).render(
          "errors/500",
          {
            title: "Logout Error",
            message:
              "Unable to logout safely."
          }
        );
      }

      res.clearCookie(
        "connect.sid"
      );

      return res.redirect(
        "/auth/login?message=You+have+been+logged+out."
      );
    }
  );
}

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

            return res.status(500).render(
              "errors/500",
              {
                title:
                  "Authentication Error",
                message:
                  "Unable to create a secure session."
              }
            );
          }

          req.session.user =
            user;

          req.session.save(
            (saveError) => {
              if (saveError) {
                console.error(
                  "Session save error:",
                  saveError
                );

                return res.status(500).render(
                  "errors/500",
                  {
                    title:
                      "Authentication Error",
                    message:
                      "Unable to save your session."
                  }
                );
              }

              res.redirect(
                redirectPath
              );

              resolve();
            }
          );
        }
      );
    }
  );
}

module.exports = {
  renderRegister,
  register,
  renderLogin,
  login,
  renderVerifyEmail,
  verifyEmail,
  resendOtp,
  logout
};
const bcrypt = require("bcryptjs");

const connectDB = require("../config/db");
const User = require("../models/User");

const {
  generateOtp,
  hashOtp,
  verifyOtp,
  createOtpExpiry,
  getOtpExpirationMinutes,
  getMaxOtpAttempts,
  getRemainingCooldown
} = require("../utils/otp");

const {
  sendVerificationOtpEmail
} = require("../config/mail");

const ALLOWED_REGISTRATION_ROLES = [
  "LENDER",
  "BORROWER"
];

function getInstitutionalDomains() {
  return String(
    process.env.INSTITUTIONAL_EMAIL_DOMAINS ||
      ""
  )
    .split(",")
    .map((domain) =>
      domain
        .trim()
        .toLowerCase()
        .replace(/^@/, "")
    )
    .filter(Boolean);
}

function isInstitutionalEmail(email) {
  const normalizedEmail =
    email.trim().toLowerCase();

  const domains =
    getInstitutionalDomains();

  if (domains.length === 0) {
    throw new Error(
      "Institutional email domains are not configured."
    );
  }

  return domains.some(
    (domain) =>
      normalizedEmail.endsWith(
        `@${domain}`
      )
  );
}

function toSessionUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    year: user.year,
    trustScore: user.trustScore
  };
}

async function registerUser(userData) {
  await connectDB();

  const {
    name,
    email,
    password,
    role,
    department,
    year,
    phone
  } = userData;

  const normalizedEmail =
    email.trim().toLowerCase();

  if (
    !isInstitutionalEmail(
      normalizedEmail
    )
  ) {
    throw new Error(
      "Please use your institutional email address."
    );
  }

  const existingUser =
    await User.findOne({
      email: normalizedEmail
    });

  if (existingUser) {
    throw new Error(
      "An account with this email already exists."
    );
  }

  if (
    !ALLOWED_REGISTRATION_ROLES.includes(
      role
    )
  ) {
    throw new Error(
      "Invalid registration role."
    );
  }

  const hashedPassword =
    await bcrypt.hash(
      password,
      12
    );

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role,
    department: department.trim(),
    year: Number(year),
    phone: phone
      ? phone.trim()
      : "",
    isEmailVerified: false
  });

  return user;
}

async function sendOtpForUser(
  userId
) {
  await connectDB();

  const user =
    await User.findById(userId).select(
      "+otpHash +otpExpiry +otpAttempts +otpLastSentAt"
    );

  if (!user) {
    throw new Error(
      "Verification account not found."
    );
  }

  if (user.isEmailVerified) {
    throw new Error(
      "This email is already verified."
    );
  }

  const remainingCooldown =
    getRemainingCooldown(
      user.otpLastSentAt
    );

  if (remainingCooldown > 0) {
    const error = new Error(
      `Please wait ${remainingCooldown} seconds before requesting another OTP.`
    );

    error.code =
      "OTP_COOLDOWN";

    error.remainingSeconds =
      remainingCooldown;

    throw error;
  }

  const otp =
    generateOtp();

  user.otpHash =
    hashOtp(otp);

  user.otpExpiry =
    createOtpExpiry();

  user.otpAttempts = 0;

  user.otpLastSentAt =
    new Date();

  await user.save();

  try {
    await sendVerificationOtpEmail({
      to: user.email,
      name: user.name,
      otp,
      expiresInMinutes:
        getOtpExpirationMinutes()
    });
  } catch (error) {
    user.otpHash = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;
    user.otpLastSentAt = null;

    await user.save();

    throw new Error(
      `OTP email could not be sent. ${error.message}`
    );
  }

  return {
    email: user.email,
    expiresInMinutes:
      getOtpExpirationMinutes()
  };
}

async function verifyUserOtp(
  userId,
  otp
) {
  await connectDB();

  const user =
    await User.findById(userId).select(
      "+otpHash +otpExpiry +otpAttempts +otpLastSentAt"
    );

  if (!user) {
    throw new Error(
      "Verification account not found."
    );
  }

  if (user.isEmailVerified) {
    throw new Error(
      "This email is already verified."
    );
  }

  if (
    !user.otpHash ||
    !user.otpExpiry
  ) {
    throw new Error(
      "No active OTP exists. Please request a new OTP."
    );
  }

  if (
    new Date() >
    new Date(user.otpExpiry)
  ) {
    user.otpHash = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;

    await user.save();

    throw new Error(
      "OTP has expired. Please request a new OTP."
    );
  }

  const maxAttempts =
    getMaxOtpAttempts();

  if (
    user.otpAttempts >=
    maxAttempts
  ) {
    user.otpHash = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;

    await user.save();

    throw new Error(
      "Maximum OTP attempts reached. Please request a new OTP."
    );
  }

  const isValid =
    verifyOtp(
      otp,
      user.otpHash
    );

  if (!isValid) {
    user.otpAttempts += 1;

    if (
      user.otpAttempts >=
      maxAttempts
    ) {
      user.otpHash = null;
      user.otpExpiry = null;
      user.otpAttempts = 0;

      await user.save();

      throw new Error(
        "Maximum OTP attempts reached. Please request a new OTP."
      );
    }

    await user.save();

    const remainingAttempts =
      maxAttempts -
      user.otpAttempts;

    throw new Error(
      `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
    );
  }

  user.isEmailVerified =
    true;

  user.otpHash = null;
  user.otpExpiry = null;
  user.otpAttempts = 0;
  user.otpLastSentAt = null;

  await user.save();

  return toSessionUser(user);
}

async function loginUser(
  email,
  password
) {
  await connectDB();

  const normalizedEmail =
    email.trim().toLowerCase();

  const user =
    await User.findOne({
      email: normalizedEmail
    }).select("+password");

  if (!user) {
    throw new Error(
      "Invalid email or password."
    );
  }

  const passwordMatches =
    await bcrypt.compare(
      password,
      user.password
    );

  if (!passwordMatches) {
    throw new Error(
      "Invalid email or password."
    );
  }

  if (!user.isEmailVerified) {
    const error = new Error(
      "Please verify your email before logging in."
    );

    error.code =
      "EMAIL_NOT_VERIFIED";

    error.userId =
      user._id.toString();

    throw error;
  }

  return toSessionUser(user);
}

async function getUserForVerification(
  userId
) {
  await connectDB();

  const user =
    await User.findById(userId);

  if (!user) {
    throw new Error(
      "Verification account not found."
    );
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    isEmailVerified:
      user.isEmailVerified
  };
}

module.exports = {
  registerUser,
  loginUser,
  sendOtpForUser,
  verifyUserOtp,
  getUserForVerification
};
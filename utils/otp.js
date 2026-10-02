const crypto = require("crypto");

function getOtpExpirationMinutes() {
  const value =
    Number(process.env.OTP_EXPIRE_MINUTES);

  return Number.isFinite(value) &&
    value > 0
    ? value
    : 10;
}

function getMaxOtpAttempts() {
  const value =
    Number(process.env.OTP_MAX_ATTEMPTS);

  return Number.isInteger(value) &&
    value > 0
    ? value
    : 5;
}

function getResendCooldownSeconds() {
  const value =
    Number(
      process.env.OTP_RESEND_COOLDOWN_SECONDS
    );

  return Number.isInteger(value) &&
    value >= 0
    ? value
    : 60;
}

function generateOtp() {
  return String(
    crypto.randomInt(
      100000,
      1000000
    )
  );
}

function hashOtp(otp) {
  if (!process.env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET is required for OTP protection."
    );
  }

  return crypto
    .createHmac(
      "sha256",
      process.env.SESSION_SECRET
    )
    .update(String(otp))
    .digest("hex");
}

function verifyOtp(
  otp,
  storedHash
) {
  const calculatedHash =
    hashOtp(otp);

  const first =
    Buffer.from(
      calculatedHash,
      "hex"
    );

  const second =
    Buffer.from(
      storedHash,
      "hex"
    );

  if (
    first.length !==
    second.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    first,
    second
  );
}

function createOtpExpiry() {
  const expiry =
    new Date();

  expiry.setMinutes(
    expiry.getMinutes() +
      getOtpExpirationMinutes()
  );

  return expiry;
}

function getRemainingCooldown(
  lastSentAt
) {
  if (!lastSentAt) {
    return 0;
  }

  const cooldownMs =
    getResendCooldownSeconds() *
    1000;

  const elapsed =
    Date.now() -
    new Date(lastSentAt).getTime();

  const remaining =
    cooldownMs - elapsed;

  return Math.max(
    0,
    Math.ceil(
      remaining / 1000
    )
  );
}

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
  createOtpExpiry,
  getOtpExpirationMinutes,
  getMaxOtpAttempts,
  getRemainingCooldown
};
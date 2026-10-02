const nodemailer = require("nodemailer");

function isDemoMode() {
  return (
    String(process.env.OTP_DEMO_MODE).toLowerCase() ===
    "true"
  );
}

function createTransporter() {
  if (isDemoMode()) {
    return null;
  }

  const requiredVariables = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "EMAIL_FROM"
  ];

  const missingVariables =
    requiredVariables.filter(
      (variable) =>
        !process.env[variable]
    );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing SMTP configuration: ${missingVariables.join(", ")}`
    );
  }

  const port =
    Number(process.env.SMTP_PORT) || 587;

  const secure =
    String(process.env.SMTP_SECURE).toLowerCase() ===
    "true";

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      minVersion: "TLSv1.2"
    }
  });
}

async function sendVerificationOtpEmail({
  to,
  name,
  otp,
  expiresInMinutes
}) {
  if (isDemoMode()) {
    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      console.log(
        `[OTP DEMO MODE] ${to} => ${otp}`
      );
    }

    return {
      demo: true
    };
  }

  const transporter =
    createTransporter();

  const subject =
    "Your Campus Exchange Verification Code";

  const text = `
Hello ${name},

Your Campus Exchange verification code is:

${otp}

This code expires in ${expiresInMinutes} minutes.

Do not share this code with anyone.

If you did not create this account, you can ignore this email.

Campus Exchange
`;

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Campus Exchange</h2>

    <p>Hello ${escapeHtml(name)},</p>

    <p>
      Your email verification code is:
    </p>

    <div
      style="
        display:inline-block;
        padding:14px 22px;
        background:#f1f5f9;
        border-radius:10px;
        font-size:28px;
        font-weight:700;
        letter-spacing:8px;
      "
    >
      ${otp}
    </div>

    <p>
      This code expires in
      <strong>${expiresInMinutes} minutes</strong>.
    </p>

    <p>
      Do not share this code with anyone.
    </p>

    <p>
      Campus Exchange
    </p>
  </body>
</html>
`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html
  });

  return {
    demo: false
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

module.exports = {
  sendVerificationOtpEmail
};
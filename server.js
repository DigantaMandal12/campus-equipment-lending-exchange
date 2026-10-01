"use strict";

require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB =
  require("./config/db");

const createSessionMiddleware =
  require("./config/session");


// ==================================================
// ROUTES
// ==================================================

const homeRoutes =
  require("./routes/homeRoutes");

const healthRoutes =
  require("./routes/healthRoutes");

const authRoutes =
  require("./routes/authRoutes");

const dashboardRoutes =
  require("./routes/dashboardRoutes");

const equipmentRoutes =
  require("./routes/equipmentRoutes");

const borrowRoutes =
  require("./routes/borrowRoutes");

const lenderRoutes =
  require("./routes/lenderRoutes");

const checkoutRoutes =
  require("./routes/checkoutRoutes");

const paymentRoutes =
  require("./routes/paymentRoutes");

const returnRoutes =
  require("./routes/returnRoutes");

const notificationRoutes =
  require("./routes/notificationRoutes");

const reminderRoutes =
  require("./routes/reminderRoutes");

const ratingRoutes =
  require("./routes/ratingRoutes");


// --------------------------------------------------
// PHASE 5D
// SMART SEARCH
// --------------------------------------------------

const searchRoutes =
  require("./routes/searchRoutes");


// --------------------------------------------------
// PHASE 6
// AI HARDWARE ASSISTANT
// --------------------------------------------------

const chatbotRoutes =
  require("./routes/chatbotRoutes");


// ==================================================
// MIDDLEWARE
// ==================================================

const {
  attachCurrentUser,
} = require("./middleware/authMiddleware");

const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/errorMiddleware");


// ==================================================
// APP
// ==================================================

const app =
  express();

const PORT =
  process.env.PORT || 3000;


// --------------------------------------------------
// VERCEL / PROXY
// --------------------------------------------------

if (
  process.env.NODE_ENV === "production"
) {

  app.set(
    "trust proxy",
    1
  );

}


// --------------------------------------------------
// VIEW ENGINE
// --------------------------------------------------

app.set(
  "view engine",
  "ejs"
);

app.set(
  "views",
  path.join(
    __dirname,
    "views"
  )
);


// --------------------------------------------------
// SECURITY
// --------------------------------------------------

app.disable(
  "x-powered-by"
);

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);


// --------------------------------------------------
// LOGGING
// --------------------------------------------------

app.use(
  morgan(
    process.env.NODE_ENV === "production"
      ? "combined"
      : "dev"
  )
);


// --------------------------------------------------
// BODY PARSERS
// --------------------------------------------------

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);


// --------------------------------------------------
// STATIC FILES
// --------------------------------------------------

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    ),
    {
      maxAge:
        process.env.NODE_ENV === "production"
          ? "1d"
          : 0,
    }
  )
);


// --------------------------------------------------
// SESSION
// --------------------------------------------------

app.use(
  createSessionMiddleware()
);


// --------------------------------------------------
// CURRENT USER
// --------------------------------------------------

app.use(
  attachCurrentUser
);


// ==================================================
// ROUTE MOUNTS
// ==================================================


// --------------------------------------------------
// HOME
// --------------------------------------------------

app.use(
  "/",
  homeRoutes
);


// --------------------------------------------------
// HEALTH
// --------------------------------------------------

app.use(
  "/health",
  healthRoutes
);


// --------------------------------------------------
// AUTH
// --------------------------------------------------

app.use(
  "/auth",
  authRoutes
);


// --------------------------------------------------
// DASHBOARD
// --------------------------------------------------

app.use(
  "/dashboard",
  dashboardRoutes
);


// --------------------------------------------------
// EQUIPMENT
// --------------------------------------------------

app.use(
  "/equipment",
  equipmentRoutes
);


// ==================================================
// PHASE 4
// ==================================================


// --------------------------------------------------
// PHASE 4A
// BORROW REQUEST FOUNDATION
// --------------------------------------------------

app.use(
  "/borrow",
  borrowRoutes
);


// --------------------------------------------------
// PHASE 4B
// LENDER APPROVAL / REJECTION
// --------------------------------------------------

app.use(
  "/lender",
  lenderRoutes
);


// --------------------------------------------------
// PHASE 4C
// ATOMIC CHECKOUT / HANDOVER
// --------------------------------------------------

app.use(
  "/checkout",
  checkoutRoutes
);


// --------------------------------------------------
// PHASE 4D
// QR PAYMENT / UTR VERIFICATION
// --------------------------------------------------

app.use(
  "/payment",
  paymentRoutes
);


// --------------------------------------------------
// PHASE 4E
// RETURN / HANDOVER-BACK
// --------------------------------------------------

app.use(
  "/return",
  returnRoutes
);


// --------------------------------------------------
// PHASE 4F
// BORROWER NOTIFICATIONS
// --------------------------------------------------

app.use(
  "/notifications",
  notificationRoutes
);


// --------------------------------------------------
// PHASE 4F
// DUE-DATE REMINDER JOB
// --------------------------------------------------

app.use(
  "/reminders",
  reminderRoutes
);


// ==================================================
// PHASE 5
// ==================================================


// --------------------------------------------------
// PHASE 5A
// TWO-WAY RATING SYSTEM
// --------------------------------------------------

app.use(
  "/rating",
  ratingRoutes
);


// --------------------------------------------------
// PHASE 5D
// SMART SEARCH
// --------------------------------------------------

app.use(
  "/search",
  searchRoutes
);


// ==================================================
// PHASE 6
// AI HARDWARE ASSISTANT
// ==================================================

// GET  /chatbot
// POST /chatbot/ask

app.use(
  "/chatbot",
  chatbotRoutes
);


// ==================================================
// 404
// ==================================================

app.use(
  notFoundHandler
);


// ==================================================
// ERROR HANDLER
// ==================================================

app.use(
  errorHandler
);


// ==================================================
// LOCAL DEVELOPMENT
// ==================================================

async function startLocalServer() {

  try {

    // ------------------------------------------------
    // DATABASE ENVIRONMENT CHECK
    // ------------------------------------------------

    if (
      !process.env.MONGODB_URI
    ) {

      throw new Error(
        "MONGODB_URI is missing. Create a .env file before starting the server."
      );

    }


    // ------------------------------------------------
    // SESSION ENVIRONMENT CHECK
    // ------------------------------------------------

    if (
      !process.env.SESSION_SECRET
    ) {

      throw new Error(
        "SESSION_SECRET is missing. Add SESSION_SECRET to your .env file."
      );

    }


    // ------------------------------------------------
    // DATABASE CONNECTION
    // ------------------------------------------------

    await connectDB();


    // ------------------------------------------------
    // START SERVER
    // ------------------------------------------------

    app.listen(
      PORT,
      () => {

        console.log(
          `Server running at http://localhost:${PORT}`
        );

        console.log(
          `Smart Search: http://localhost:${PORT}/search`
        );

        console.log(
          `AI Hardware Assistant: http://localhost:${PORT}/chatbot`
        );

      }
    );

  } catch (
    error
  ) {

    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);

  }

}


// ==================================================
// START LOCAL SERVER
// ==================================================

if (
  require.main === module &&
  process.env.VERCEL !== "1"
) {

  startLocalServer();

}


// ==================================================
// VERCEL EXPORT
// ==================================================

module.exports =
  app;
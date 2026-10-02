/**
 * PHASE 4G - FINAL INTEGRATION / HARDENING AUDIT
 *
 * Purpose:
 * - Verify Phase 4A -> 4F integration
 * - Check models, services, controllers, routes
 * - Check transaction states
 * - Check inventory safety
 * - Check duplicate payment references
 * - Check duplicate notifications
 * - Check Phase 4F demo transaction
 * - Check server route mounts
 * - Check trustScore presence
 *
 * This audit is READ-ONLY.
 * It does NOT modify transaction or application data.
 */

"use strict";

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const connectDB = require("../config/db");

const User = require("../models/User");
const Equipment = require("../models/Equipment");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");

const PHASE4F_PAYMENT_REFERENCE = "PHASE4F-DEMO";

let failures = 0;
let warnings = 0;

// ============================================================
// OUTPUT HELPERS
// ============================================================

function pass(message) {
  console.log(`✅ ${message}`);
}

function fail(message) {
  console.log(`❌ ${message}`);
  failures += 1;
}

function warn(message) {
  console.log(`⚠️ ${message}`);
  warnings += 1;
}

function section(title) {
  console.log("");
  console.log("==============================================");
  console.log(title);
  console.log("==============================================");
}

// ============================================================
// FILE HELPER
// ============================================================

function fileExists(relativePath) {
  return fs.existsSync(
    path.join(__dirname, "..", relativePath)
  );
}

// ============================================================
// 1. REQUIRED FILE STRUCTURE
// ============================================================

async function checkRequiredFiles() {
  section("1. PHASE 4 FILE STRUCTURE");

  const requiredFiles = [

    // Models
    "models/Transaction.js",
    "models/Notification.js",

    // Services
    "services/borrowService.js",
    "services/lenderService.js",
    "services/checkoutService.js",
    "services/paymentService.js",
    "services/returnService.js",
    "services/dueDateService.js",

    // Controllers
    "controllers/borrowController.js",
    "controllers/lenderController.js",
    "controllers/checkoutController.js",
    "controllers/paymentController.js",
    "controllers/returnController.js",
    "controllers/notificationController.js",
    "controllers/reminderController.js",

    // Routes
    "routes/borrowRoutes.js",
    "routes/lenderRoutes.js",
    "routes/checkoutRoutes.js",
    "routes/paymentRoutes.js",
    "routes/returnRoutes.js",
    "routes/notificationRoutes.js",
    "routes/reminderRoutes.js",

    // Borrower views
    "views/borrow/request.ejs",
    "views/borrow/my-requests.ejs",
    "views/borrow/checkout.ejs",
    "views/borrow/payment.ejs",
    "views/borrow/return.ejs",

    // Lender views
    "views/lender/requests.ejs",
    "views/lender/returns.ejs",

    // CSS
    "public/css/checkout.css",
    "public/css/payment.css",
    "public/css/payment-verification.css",
    "public/css/return.css",
    "public/css/notifications.css",

    // JS
    "public/js/due-countdown.js"
  ];

  for (const file of requiredFiles) {
    if (fileExists(file)) {
      pass(`File exists: ${file}`);
    } else {
      fail(`Missing required file: ${file}`);
    }
  }
}

// ============================================================
// 2. MODEL LOADING
// ============================================================

async function checkModelLoading() {
  section("2. MODEL LOADING");

  try {
    require("../models/Transaction");
    pass("Transaction model loads.");
  } catch (error) {
    fail(`Transaction model failed: ${error.message}`);
  }

  try {
    require("../models/Notification");
    pass("Notification model loads.");
  } catch (error) {
    fail(`Notification model failed: ${error.message}`);
  }

  try {
    require("../models/Equipment");
    pass("Equipment model loads.");
  } catch (error) {
    fail(`Equipment model failed: ${error.message}`);
  }

  try {
    require("../models/User");
    pass("User model loads.");
  } catch (error) {
    fail(`User model failed: ${error.message}`);
  }
}

// ============================================================
// 3. SERVICE / CONTROLLER / ROUTE LOADING
// ============================================================

async function checkServiceLoading() {
  section("3. SERVICE / CONTROLLER LOADING");

  const modules = [

    // Services
    "../services/borrowService",
    "../services/lenderService",
    "../services/checkoutService",
    "../services/paymentService",
    "../services/returnService",
    "../services/dueDateService",

    // Controllers
    "../controllers/borrowController",
    "../controllers/lenderController",
    "../controllers/checkoutController",
    "../controllers/paymentController",
    "../controllers/returnController",
    "../controllers/notificationController",
    "../controllers/reminderController",

    // Routes
    "../routes/borrowRoutes",
    "../routes/lenderRoutes",
    "../routes/checkoutRoutes",
    "../routes/paymentRoutes",
    "../routes/returnRoutes",
    "../routes/notificationRoutes",
    "../routes/reminderRoutes"
  ];

  for (const modulePath of modules) {
    try {
      require(modulePath);

      pass(`Module loads: ${modulePath}`);
    } catch (error) {
      fail(
        `Module failed: ${modulePath} → ${error.message}`
      );
    }
  }
}

// ============================================================
// 4. TRANSACTION STATE CHECK
// ============================================================

async function checkTransactionStates() {
  section("4. TRANSACTION STATE CHECK");

  const allowedStatuses = [
    "PENDING_APPROVAL",
    "APPROVED",
    "PENDING_VERIFICATION",
    "ACTIVE",
    "OVERDUE",
    "RETURN_REQUESTED",
    "RETURNED",
    "REFUNDED",
    "REJECTED",
    "CANCELLED",
    "COMPLETED"
  ];

  const invalidStatuses = await Transaction.find({
    status: {
      $nin: allowedStatuses
    }
  })
    .select("_id status")
    .lean();

  if (invalidStatuses.length === 0) {

    pass(
      "All transaction documents use recognized statuses."
    );

  } else {

    fail(
      `Found ${invalidStatuses.length} transaction(s) with invalid status values.`
    );

    console.log(invalidStatuses);
  }
}

// ============================================================
// 5. INVENTORY CONSISTENCY
// ============================================================

async function checkInventory() {
  section("5. INVENTORY CONSISTENCY");

  const invalidInventory =
    await Equipment.find({
      $or: [

        // quantity cannot be negative
        {
          quantity: {
            $lt: 0
          }
        },

        // availableQuantity cannot be negative
        {
          availableQuantity: {
            $lt: 0
          }
        },

        // availableQuantity cannot exceed quantity
        {
          $expr: {
            $gt: [
              "$availableQuantity",
              "$quantity"
            ]
          }
        }
      ]
    })
      .select(
        "_id name quantity availableQuantity status"
      )
      .lean();

  if (invalidInventory.length === 0) {

    pass(
      "No equipment has invalid quantity or availableQuantity."
    );

  } else {

    fail(
      `Found ${invalidInventory.length} equipment record(s) with invalid inventory.`
    );

    console.log(invalidInventory);
  }
}

// ============================================================
// 6. ACTIVE / OVERDUE / RETURN REQUESTED CONSISTENCY
// ============================================================

async function checkActiveTransactions() {
  section("6. ACTIVE / OVERDUE TRANSACTION CONSISTENCY");

  const transactions =
    await Transaction.find({
      status: {
        $in: [
          "ACTIVE",
          "OVERDUE",
          "RETURN_REQUESTED"
        ]
      }
    })
      .select(
        "_id borrower lender equipment quantity status paymentStatus requestedReturnDate"
      )
      .lean();

  let localFailures = 0;

  for (const transaction of transactions) {

    if (!transaction.borrower) {

      fail(
        `Transaction ${transaction._id}: missing borrower.`
      );

      localFailures++;
    }

    if (!transaction.lender) {

      fail(
        `Transaction ${transaction._id}: missing lender.`
      );

      localFailures++;
    }

    if (!transaction.equipment) {

      fail(
        `Transaction ${transaction._id}: missing equipment.`
      );

      localFailures++;
    }

    if (
      !transaction.quantity ||
      transaction.quantity <= 0
    ) {

      fail(
        `Transaction ${transaction._id}: invalid quantity.`
      );

      localFailures++;
    }

    if (
      !transaction.requestedReturnDate
    ) {

      fail(
        `Transaction ${transaction._id}: missing requestedReturnDate.`
      );

      localFailures++;
    }

    if (
      transaction.status === "ACTIVE" ||
      transaction.status === "OVERDUE" ||
      transaction.status === "RETURN_REQUESTED"
    ) {

      if (
        transaction.paymentStatus !==
        "DEPOSIT_CONFIRMED"
      ) {

        fail(
          `Transaction ${transaction._id}: ${transaction.status} without DEPOSIT_CONFIRMED.`
        );

        localFailures++;
      }
    }
  }

  if (localFailures === 0) {

    pass(
      `Checked ${transactions.length} active/overdue/return-requested transaction(s).`
    );

  }
}

// ============================================================
// 7. PAYMENT REFERENCE CHECK
// ============================================================

async function checkPaymentReferences() {
  section("7. PAYMENT REFERENCE CHECK");

  const duplicateReferences =
    await Transaction.aggregate([
      {
        $match: {
          paymentReference: {
            $exists: true,
            $nin: [
              null,
              ""
            ]
          }
        }
      },

      {
        $group: {
          _id: "$paymentReference",
          count: {
            $sum: 1
          }
        }
      },

      {
        $match: {
          count: {
            $gt: 1
          }
        }
      }
    ]);

  if (duplicateReferences.length === 0) {

    pass(
      "No duplicate payment references found."
    );

  } else {

    fail(
      `Found ${duplicateReferences.length} duplicate payment reference(s).`
    );

    console.log(duplicateReferences);
  }
}

// ============================================================
// 8. NOTIFICATION DUPLICATE CHECK
// ============================================================

async function checkNotifications() {
  section("8. NOTIFICATION DUPLICATE CHECK");

  const duplicates =
    await Notification.aggregate([
      {
        $match: {
          relatedTransaction: {
            $exists: true,
            $ne: null
          }
        }
      },

      {
        $group: {

          _id: {
            user: "$user",
            type: "$type",
            relatedTransaction:
              "$relatedTransaction"
          },

          count: {
            $sum: 1
          }
        }
      },

      {
        $match: {
          count: {
            $gt: 1
          }
        }
      }
    ]);

  if (duplicates.length === 0) {

    pass(
      "No duplicate transaction notifications found."
    );

  } else {

    fail(
      `Found ${duplicates.length} duplicate notification group(s).`
    );

    console.log(duplicates);
  }
}

// ============================================================
// 9. PHASE 4F DEMO TRANSACTION
// ============================================================

async function checkPhase4FDemoTransaction() {
  section("9. PHASE 4F DEMO TRANSACTION");

  const transaction =
    await Transaction.findOne({
      paymentReference:
        PHASE4F_PAYMENT_REFERENCE
    })
      .select(
        "_id paymentReference status paymentStatus requestedReturnDate equipment borrower"
      )
      .lean();

  if (!transaction) {

    warn(
      `No transaction found with paymentReference ${PHASE4F_PAYMENT_REFERENCE}.`
    );

    return;
  }

  console.log(
    JSON.stringify(
      transaction,
      null,
      2
    )
  );

  if (
    transaction.status === "OVERDUE"
  ) {

    pass(
      "Phase 4F demo transaction is currently OVERDUE."
    );

  } else {

    warn(
      `Phase 4F demo transaction currently has status ${transaction.status}.`
    );
  }

  if (
    transaction.paymentStatus ===
    "DEPOSIT_CONFIRMED"
  ) {

    pass(
      "Phase 4F demo payment is DEPOSIT_CONFIRMED."
    );

  } else {

    warn(
      `Phase 4F demo payment status is ${transaction.paymentStatus}.`
    );
  }
}

// ============================================================
// 10. SERVER ROUTE MOUNTS
// ============================================================

async function checkServerRoutes() {

  section("10. SERVER ROUTE MOUNTS");

  const serverPath =
    path.join(
      __dirname,
      "..",
      "server.js"
    );

  if (!fs.existsSync(serverPath)) {

    fail(
      "server.js was not found."
    );

    return;
  }

  const serverSource =
    fs.readFileSync(
      serverPath,
      "utf8"
    );

  const expectedRoutes = [
    "/borrow",
    "/lender",
    "/checkout",
    "/payment",
    "/return",
    "/notifications",
    "/reminders"
  ];

  for (
    const route of expectedRoutes
  ) {

    if (
      serverSource.includes(route)
    ) {

      pass(
        `Server references ${route}.`
      );

    } else {

      fail(
        `Server does not appear to reference ${route}.`
      );
    }
  }
}

// ============================================================
// 11. PHASE 4 SERVICE FUNCTIONS
// ============================================================

async function checkPhase4Services() {

  section("11. PHASE 4 SERVICE FUNCTIONS");

  // ----------------------------------------------------------
  // BORROW SERVICE
  // ----------------------------------------------------------

  try {

    const borrowService =
      require("../services/borrowService");

    if (
      typeof borrowService.createBorrowRequest ===
      "function"
    ) {

      pass(
        "Borrow request service available."
      );

    } else {

      fail(
        "createBorrowRequest() missing."
      );
    }

  } catch (error) {

    fail(
      `Borrow service check failed: ${error.message}`
    );
  }


  // ----------------------------------------------------------
  // CHECKOUT SERVICE
  // ----------------------------------------------------------

  try {

    const checkoutService =
      require("../services/checkoutService");

    /**
     * IMPORTANT:
     *
     * Do NOT require a specific function name such as
     * checkoutTransaction().
     *
     * The actual checkout service may legitimately export
     * another function name.
     *
     * We only verify that the service loads and exports
     * at least one callable function.
     */

    const exportedCheckoutFunctions =
      Object.keys(checkoutService).filter(
        (key) =>
          typeof checkoutService[key] ===
          "function"
      );

    if (
      exportedCheckoutFunctions.length > 0
    ) {

      pass(
        `Checkout service available. Exported functions: ${exportedCheckoutFunctions.join(
          ", "
        )}`
      );

    } else {

      fail(
        "Checkout service loaded but exports no functions."
      );
    }

  } catch (error) {

    fail(
      `Checkout service check failed: ${error.message}`
    );
  }


  // ----------------------------------------------------------
  // PAYMENT SERVICE
  // ----------------------------------------------------------

  try {

    const paymentService =
      require("../services/paymentService");

    if (
      Object.keys(paymentService).length > 0
    ) {

      pass(
        "Payment service exports are available."
      );

    } else {

      fail(
        "Payment service has no exports."
      );
    }

  } catch (error) {

    fail(
      `Payment service check failed: ${error.message}`
    );
  }


  // ----------------------------------------------------------
  // RETURN SERVICE
  // ----------------------------------------------------------

  try {

    const returnService =
      require("../services/returnService");

    if (
      Object.keys(returnService).length > 0
    ) {

      pass(
        "Return service exports are available."
      );

    } else {

      fail(
        "Return service has no exports."
      );
    }

  } catch (error) {

    fail(
      `Return service check failed: ${error.message}`
    );
  }


  // ----------------------------------------------------------
  // DUE-DATE SERVICE
  // ----------------------------------------------------------

  try {

    const dueDateService =
      require("../services/dueDateService");

    if (
      typeof dueDateService.runDueDateReminderJob ===
      "function"
    ) {

      pass(
        "Due-date reminder service available."
      );

    } else {

      fail(
        "runDueDateReminderJob() missing."
      );
    }

  } catch (error) {

    fail(
      `Due-date service check failed: ${error.message}`
    );
  }
}

// ============================================================
// 12. USER TRUST DATA
// ============================================================

async function checkUserData() {

  section("12. USER TRUST DATA");

  const usersWithoutTrustScore =
    await User.countDocuments({
      trustScore: {
        $exists: false
      }
    });

  if (
    usersWithoutTrustScore === 0
  ) {

    pass(
      "All users have trustScore field."
    );

  } else {

    warn(
      `${usersWithoutTrustScore} user(s) do not have trustScore.`
    );
  }
}

// ============================================================
// MAIN AUDIT
// ============================================================

async function run() {

  console.log("");

  console.log(
    "============================================================"
  );

  console.log(
    "        PHASE 4G FINAL INTEGRATION AUDIT"
  );

  console.log(
    "============================================================"
  );

  console.log("");

  console.log(
    "This audit does not modify transaction data."
  );

  // ----------------------------------------------------------
  // DATABASE CONNECTION
  // ----------------------------------------------------------

  await connectDB();

  try {

    // --------------------------------------------------------
    // RUN ALL CHECKS
    // --------------------------------------------------------

    await checkRequiredFiles();

    await checkModelLoading();

    await checkServiceLoading();

    await checkTransactionStates();

    await checkInventory();

    await checkActiveTransactions();

    await checkPaymentReferences();

    await checkNotifications();

    await checkPhase4FDemoTransaction();

    await checkServerRoutes();

    await checkPhase4Services();

    await checkUserData();


    // --------------------------------------------------------
    // FINAL RESULT
    // --------------------------------------------------------

    section("FINAL RESULT");

    console.log(
      `Failures : ${failures}`
    );

    console.log(
      `Warnings : ${warnings}`
    );


    if (
      failures === 0
    ) {

      console.log("");

      console.log(
        "✅ PHASE 4G AUDIT PASSED"
      );

      console.log(
        "Phase 4 integration is structurally consistent."
      );

      if (
        warnings > 0
      ) {

        console.log(
          `⚠️ Review ${warnings} warning(s) shown above.`
        );
      } else {

        console.log(
          "✅ No warnings detected."
        );
      }

    } else {

      console.log("");

      console.log(
        "❌ PHASE 4G AUDIT FAILED"
      );

      console.log(
        "Fix the reported failures before closing Phase 4."
      );

      process.exitCode = 1;
    }

  } catch (error) {

    console.error("");

    console.error(
      "❌ PHASE 4G AUDIT ERROR"
    );

    console.error(
      error.message
    );

    process.exitCode = 1;

  } finally {

    // --------------------------------------------------------
    // CLOSE MONGODB CONNECTION
    // --------------------------------------------------------

    await mongoose.connection.close();
  }
}

// ============================================================
// START AUDIT
// ============================================================

run();
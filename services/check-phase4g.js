/**
 * PHASE 4G - FINAL INTEGRATION / HARDENING AUDIT
 *
 * Purpose:
 * - Verify Phase 4A -> 4F integration
 * - Check models, services, controllers, routes
 * - Check Transaction status/payment states
 * - Check inventory safety
 * - Check duplicate payment references
 * - Check duplicate notifications
 * - Check Phase 4F demo transaction
 * - Check server route mounts
 * - Check trustScore presence
 *
 * This script is READ-ONLY.
 * It does NOT modify application data.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const ROOT_DIR = path.join(__dirname, "..");

let failures = 0;
let warnings = 0;

function pass(message) {
  console.log(`✅ ${message}`);
}

function fail(message) {
  failures++;
  console.error(`❌ ${message}`);
}

function warn(message) {
  warnings++;
  console.warn(`⚠️  ${message}`);
}

function section(title) {
  console.log("\n" + "=".repeat(70));
  console.log(title);
  console.log("=".repeat(70));
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT_DIR, relativePath));
}

function readFile(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8");
}

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, "\n");
}

function hasAnyFunctionExport(moduleObject) {
  return Object.keys(moduleObject).some(
    (key) => typeof moduleObject[key] === "function"
  );
}

async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured in .env");
  }

  await mongoose.connect(mongoUri);
  pass("MongoDB connection established.");
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

async function auditRequiredFiles() {
  section("1. REQUIRED PHASE 4 FILES");

  const requiredFiles = [
    "models/Transaction.js",

    "services/borrowService.js",
    "services/lenderService.js",
    "services/checkoutService.js",
    "services/paymentService.js",
    "services/returnService.js",
    "services/dueDateService.js",

    "controllers/borrowController.js",
    "controllers/lenderController.js",
    "controllers/checkoutController.js",
    "controllers/paymentController.js",
    "controllers/returnController.js",
    "controllers/notificationController.js",
    "controllers/reminderController.js",

    "routes/borrowRoutes.js",
    "routes/lenderRoutes.js",
    "routes/checkoutRoutes.js",
    "routes/paymentRoutes.js",
    "routes/returnRoutes.js",
    "routes/notificationRoutes.js",
    "routes/reminderRoutes.js",

    "models/Notification.js",
  ];

  for (const relativePath of requiredFiles) {
    if (fileExists(relativePath)) {
      pass(`File exists: ${relativePath}`);
    } else {
      fail(`Missing required file: ${relativePath}`);
    }
  }
}

async function auditModelLoading() {
  section("2. MODEL LOADING");

  const models = [
    ["Transaction", "../models/Transaction"],
    ["Notification", "../models/Notification"],
    ["User", "../models/User"],
    ["Equipment", "../models/Equipment"],
  ];

  for (const [name, modulePath] of models) {
    try {
      const model = require(path.join(__dirname, modulePath));

      if (model) {
        pass(`${name} model loaded.`);
      } else {
        fail(`${name} model returned an invalid value.`);
      }
    } catch (error) {
      fail(`${name} model failed to load: ${error.message}`);
    }
  }
}

async function auditServicesControllersRoutes() {
  section("3. SERVICES / CONTROLLERS / ROUTES LOADING");

  const modules = [
    ["Borrow service", "../services/borrowService"],
    ["Lender service", "../services/lenderService"],
    ["Checkout service", "../services/checkoutService"],
    ["Payment service", "../services/paymentService"],
    ["Return service", "../services/returnService"],
    ["Due-date service", "../services/dueDateService"],

    ["Borrow controller", "../controllers/borrowController"],
    ["Lender controller", "../controllers/lenderController"],
    ["Checkout controller", "../controllers/checkoutController"],
    ["Payment controller", "../controllers/paymentController"],
    ["Return controller", "../controllers/returnController"],
    ["Notification controller", "../controllers/notificationController"],
    ["Reminder controller", "../controllers/reminderController"],

    ["Borrow routes", "../routes/borrowRoutes"],
    ["Lender routes", "../routes/lenderRoutes"],
    ["Checkout routes", "../routes/checkoutRoutes"],
    ["Payment routes", "../routes/paymentRoutes"],
    ["Return routes", "../routes/returnRoutes"],
    ["Notification routes", "../routes/notificationRoutes"],
    ["Reminder routes", "../routes/reminderRoutes"],
  ];

  for (const [label, modulePath] of modules) {
    try {
      const loadedModule = require(path.join(__dirname, modulePath));

      if (loadedModule) {
        pass(`${label} loaded.`);
      } else {
        fail(`${label} returned an invalid value.`);
      }
    } catch (error) {
      fail(`${label} failed to load: ${error.message}`);
    }
  }
}

async function auditTransactionStatuses() {
  section("4. TRANSACTION STATUS VALIDATION");

  try {
    const Transaction = require("../models/Transaction");

    const schema = Transaction.schema;
    const statusPath = schema.path("status");

    if (!statusPath) {
      fail("Transaction.status field not found.");
      return;
    }

    const enumValues = statusPath.enumValues || [];

    const expectedStatuses = [
      "PENDING_APPROVAL",
      "REJECTED",
      "APPROVED",
      "ACTIVE",
      "RETURN_REQUESTED",
      "RETURNED",
      "COMPLETED",
      "CANCELLED",
      "OVERDUE",
    ];

    const missing = expectedStatuses.filter(
      (status) => !enumValues.includes(status)
    );

    if (missing.length === 0) {
      pass(
        `All required transaction statuses exist: ${expectedStatuses.join(
          ", "
        )}`
      );
    } else {
      fail(
        `Missing transaction statuses: ${missing.join(", ")}`
      );
    }
  } catch (error) {
    fail(`Transaction status audit failed: ${error.message}`);
  }
}

async function auditPaymentStatuses() {
  section("5. PAYMENT STATUS VALIDATION");

  try {
    const Transaction = require("../models/Transaction");

    const paymentStatusPath = Transaction.schema.path("paymentStatus");

    if (!paymentStatusPath) {
      fail("Transaction.paymentStatus field not found.");
      return;
    }

    const enumValues = paymentStatusPath.enumValues || [];

    const expectedPaymentStatuses = [
      "NOT_STARTED",
      "PENDING_VERIFICATION",
      "DEPOSIT_CONFIRMED",
      "PAYMENT_REJECTED",
      "REFUND_PENDING",
      "REFUNDED",
    ];

    const missing = expectedPaymentStatuses.filter(
      (status) => !enumValues.includes(status)
    );

    if (missing.length === 0) {
      pass(
        `All required payment statuses exist: ${expectedPaymentStatuses.join(
          ", "
        )}`
      );
    } else {
      fail(
        `Missing payment statuses: ${missing.join(", ")}`
      );
    }
  } catch (error) {
    fail(`Payment status audit failed: ${error.message}`);
  }
}

async function auditInventoryConstraints() {
  section("6. INVENTORY CONSTRAINTS");

  try {
    const Equipment = require("../models/Equipment");

    const schema = Equipment.schema;

    const quantityPath = schema.path("quantity");
    const availableQuantityPath = schema.path("availableQuantity");

    if (!quantityPath) {
      fail("Equipment.quantity field not found.");
    } else {
      pass("Equipment.quantity field exists.");
    }

    if (!availableQuantityPath) {
      fail("Equipment.availableQuantity field not found.");
    } else {
      pass("Equipment.availableQuantity field exists.");
    }

    if (
      quantityPath &&
      typeof quantityPath.options.min !== "undefined" &&
      quantityPath.options.min >= 0
    ) {
      pass("Equipment.quantity has non-negative minimum constraint.");
    } else {
      warn(
        "Equipment.quantity does not expose a non-negative minimum constraint."
      );
    }

    if (
      availableQuantityPath &&
      typeof availableQuantityPath.options.min !== "undefined" &&
      availableQuantityPath.options.min >= 0
    ) {
      pass(
        "Equipment.availableQuantity has non-negative minimum constraint."
      );
    } else {
      warn(
        "Equipment.availableQuantity does not expose a non-negative minimum constraint."
      );
    }
  } catch (error) {
    fail(`Inventory constraint audit failed: ${error.message}`);
  }
}

async function auditActiveOverdueConsistency() {
  section("7. ACTIVE / OVERDUE / RETURN REQUESTED CONSISTENCY");

  try {
    const Transaction = require("../models/Transaction");

    const transactions = await Transaction.find({
      status: {
        $in: ["ACTIVE", "OVERDUE", "RETURN_REQUESTED"],
      },
    }).select(
      "_id status borrower lender equipment quantity requestedReturnDate paymentStatus"
    );

    pass(`Found ${transactions.length} active/overdue/return-requested transaction(s).`);

    for (const transaction of transactions) {
      if (!transaction.borrower) {
        fail(
          `Transaction ${transaction._id}: borrower is missing.`
        );
      }

      if (!transaction.lender) {
        fail(
          `Transaction ${transaction._id}: lender is missing.`
        );
      }

      if (!transaction.equipment) {
        fail(
          `Transaction ${transaction._id}: equipment is missing.`
        );
      }

      if (!transaction.quantity || transaction.quantity <= 0) {
        fail(
          `Transaction ${transaction._id}: invalid quantity.`
        );
      }

      if (!transaction.requestedReturnDate) {
        warn(
          `Transaction ${transaction._id}: requestedReturnDate is missing.`
        );
      }

      if (
        ["ACTIVE", "OVERDUE", "RETURN_REQUESTED"].includes(
          transaction.status
        ) &&
        transaction.paymentStatus !== "DEPOSIT_CONFIRMED"
      ) {
        warn(
          `Transaction ${transaction._id}: status=${transaction.status} but paymentStatus=${transaction.paymentStatus}.`
        );
      }
    }

    const invalidOverdue = transactions.filter(
      (transaction) =>
        transaction.status === "OVERDUE" &&
        transaction.requestedReturnDate &&
        new Date(transaction.requestedReturnDate) > new Date()
    );

    if (invalidOverdue.length === 0) {
      pass("No OVERDUE transaction has a future due date.");
    } else {
      fail(
        `${invalidOverdue.length} OVERDUE transaction(s) have a future due date.`
      );
    }
  } catch (error) {
    fail(
      `Active/overdue consistency audit failed: ${error.message}`
    );
  }
}

async function auditDuplicatePaymentReferences() {
  section("8. DUPLICATE PAYMENT REFERENCES");

  try {
    const Transaction = require("../models/Transaction");

    const duplicates = await Transaction.aggregate([
      {
        $match: {
          paymentReference: {
            $exists: true,
            $nin: [null, ""],
          },
        },
      },
      {
        $group: {
          _id: "$paymentReference",
          count: { $sum: 1 },
          transactionIds: { $push: "$_id" },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);

    if (duplicates.length === 0) {
      pass("No duplicate payment references found.");
    } else {
      fail(
        `Found ${duplicates.length} duplicate payment reference group(s).`
      );

      for (const duplicate of duplicates) {
        console.error(
          `   Reference: ${duplicate._id} | Count: ${duplicate.count}`
        );
      }
    }

    const paymentReferencePath = Transaction.schema.path(
      "paymentReference"
    );

    if (paymentReferencePath) {
      pass("Transaction.paymentReference field exists.");
    } else {
      fail("Transaction.paymentReference field not found.");
    }
  } catch (error) {
    fail(
      `Duplicate payment reference audit failed: ${error.message}`
    );
  }
}

async function auditDuplicateNotifications() {
  section("9. DUPLICATE DUE-SOON NOTIFICATIONS");

  try {
    const Notification = require("../models/Notification");

    const duplicates = await Notification.aggregate([
      {
        $match: {
          type: "DUE_SOON",
          relatedTransaction: {
            $exists: true,
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: {
            user: "$user",
            relatedTransaction: "$relatedTransaction",
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);

    if (duplicates.length === 0) {
      pass("No duplicate DUE_SOON notification groups found.");
    } else {
      fail(
        `Found ${duplicates.length} duplicate DUE_SOON notification group(s).`
      );
    }

    const indexes = await Notification.collection.getIndexes();

    const indexNames = Object.keys(indexes);

    const hasRelevantUniqueIndex = indexNames.some((indexName) => {
      const index = indexes[indexName];

      return (
        index &&
        index.unique === true &&
        index.key &&
        index.key.user === 1 &&
        index.key.type === 1 &&
        index.key.relatedTransaction === 1
      );
    });

    if (hasRelevantUniqueIndex) {
      pass(
        "Unique notification index for user/type/relatedTransaction exists."
      );
    } else {
      warn(
        "Could not confirm the unique notification index from MongoDB indexes."
      );
    }
  } catch (error) {
    fail(
      `Notification duplicate audit failed: ${error.message}`
    );
  }
}

async function auditPhase4FDemoTransaction() {
  section("10. PHASE 4F DEMO TRANSACTION");

  try {
    const Transaction = require("../models/Transaction");

    const demoTransaction = await Transaction.findOne({
      paymentReference: "PHASE4F-DEMO",
    });

    if (!demoTransaction) {
      warn(
        "PHASE4F-DEMO transaction not found. This is a warning, not a production failure."
      );
      return;
    }

    pass(`PHASE4F-DEMO transaction found: ${demoTransaction._id}`);

    pass(
      `PHASE4F-DEMO status=${demoTransaction.status}, paymentStatus=${demoTransaction.paymentStatus}`
    );

    if (
      ![
        "ACTIVE",
        "OVERDUE",
        "RETURN_REQUESTED",
        "RETURNED",
        "COMPLETED",
      ].includes(demoTransaction.status)
    ) {
      warn(
        `PHASE4F-DEMO has status ${demoTransaction.status}.`
      );
    }

    if (!demoTransaction.requestedReturnDate) {
      warn(
        "PHASE4F-DEMO has no requestedReturnDate."
      );
    }
  } catch (error) {
    fail(
      `Phase 4F demo transaction audit failed: ${error.message}`
    );
  }
}

async function auditServerRoutes() {
  section("11. SERVER ROUTE MOUNTS");

  const serverPath = path.join(ROOT_DIR, "server.js");

  if (!fs.existsSync(serverPath)) {
    fail("server.js not found.");
    return;
  }

  try {
    const serverSource = normalizeLineEndings(
      fs.readFileSync(serverPath, "utf8")
    );

    const requiredRouteMounts = [
      ["/borrow", "borrowRoutes"],
      ["/lender", "lenderRoutes"],
      ["/checkout", "checkoutRoutes"],
      ["/payment", "paymentRoutes"],
      ["/return", "returnRoutes"],
      ["/notifications", "notificationRoutes"],
      ["/reminders", "reminderRoutes"],
    ];

    for (const [routePath, routeVariable] of requiredRouteMounts) {
      const escapedRoutePath = routePath.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const escapedVariable = routeVariable.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const mountRegex = new RegExp(
        `app\\.use\\s*\\(\\s*["']${escapedRoutePath}["']\\s*,\\s*${escapedVariable}\\s*\\)`,
        "m"
      );

      if (mountRegex.test(serverSource)) {
        pass(
          `Server route mounted: ${routePath} -> ${routeVariable}`
        );
      } else {
        fail(
          `Server route mount missing: ${routePath} -> ${routeVariable}`
        );
      }
    }
  } catch (error) {
    fail(`Server route audit failed: ${error.message}`);
  }
}

async function auditPhase4Services() {
  section("12. PHASE 4 SERVICE FUNCTIONS");

  try {
    const borrowService = require("../services/borrowService");

    if (hasAnyFunctionExport(borrowService)) {
      pass(
        `Borrow service available. Exported functions: ${Object.keys(
          borrowService
        ).join(", ")}`
      );
    } else {
      fail("Borrow service loaded but exports no functions.");
    }
  } catch (error) {
    fail(`Borrow service check failed: ${error.message}`);
  }

  try {
    const lenderService = require("../services/lenderService");

    if (hasAnyFunctionExport(lenderService)) {
      pass(
        `Lender service available. Exported functions: ${Object.keys(
          lenderService
        ).join(", ")}`
      );
    } else {
      fail("Lender service loaded but exports no functions.");
    }
  } catch (error) {
    fail(`Lender service check failed: ${error.message}`);
  }

  /**
   * IMPORTANT:
   * Do NOT require a specific checkout function name here.
   *
   * Different valid implementations may export:
   * - checkoutTransaction
   * - checkoutApprovedTransaction
   * - processCheckout
   * - performCheckout
   *
   * The audit only needs to verify that checkoutService actually
   * loads and exposes at least one callable function.
   */
  try {
    const checkoutService = require("../services/checkoutService");

    const exportedCheckoutFunctions = Object.keys(
      checkoutService
    ).filter(
      (key) => typeof checkoutService[key] === "function"
    );

    if (exportedCheckoutFunctions.length > 0) {
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
    fail(`Checkout service check failed: ${error.message}`);
  }

  try {
    const paymentService = require("../services/paymentService");

    if (hasAnyFunctionExport(paymentService)) {
      pass(
        `Payment service available. Exported functions: ${Object.keys(
          paymentService
        ).join(", ")}`
      );
    } else {
      fail("Payment service loaded but exports no functions.");
    }
  } catch (error) {
    fail(`Payment service check failed: ${error.message}`);
  }

  try {
    const returnService = require("../services/returnService");

    if (hasAnyFunctionExport(returnService)) {
      pass(
        `Return service available. Exported functions: ${Object.keys(
          returnService
        ).join(", ")}`
      );
    } else {
      fail("Return service loaded but exports no functions.");
    }
  } catch (error) {
    fail(`Return service check failed: ${error.message}`);
  }

  try {
    const dueDateService = require("../services/dueDateService");

    if (hasAnyFunctionExport(dueDateService)) {
      pass(
        `Due-date service available. Exported functions: ${Object.keys(
          dueDateService
        ).join(", ")}`
      );
    } else {
      fail("Due-date service loaded but exports no functions.");
    }
  } catch (error) {
    fail(`Due-date service check failed: ${error.message}`);
  }
}

async function auditUserTrustScore() {
  section("13. USER TRUST SCORE");

  try {
    const User = require("../models/User");

    const trustScorePath = User.schema.path("trustScore");

    if (!trustScorePath) {
      fail("User.trustScore field not found.");
      return;
    }

    pass("User.trustScore field exists.");

    if (trustScorePath.options.default === 100) {
      pass("User.trustScore default is 100.");
    } else {
      warn(
        `User.trustScore default is ${trustScorePath.options.default}, expected 100.`
      );
    }

    if (trustScorePath.options.min === 0) {
      pass("User.trustScore minimum is 0.");
    } else {
      warn(
        `User.trustScore minimum is ${trustScorePath.options.min}, expected 0.`
      );
    }

    if (trustScorePath.options.max === 100) {
      pass("User.trustScore maximum is 100.");
    } else {
      warn(
        `User.trustScore maximum is ${trustScorePath.options.max}, expected 100.`
      );
    }

    const users = await User.find({})
      .select("_id name email role trustScore")
      .lean();

    let invalidUsers = 0;

    for (const user of users) {
      if (
        typeof user.trustScore !== "number" ||
        Number.isNaN(user.trustScore) ||
        user.trustScore < 0 ||
        user.trustScore > 100
      ) {
        invalidUsers++;

        fail(
          `User ${user._id} has invalid trustScore: ${user.trustScore}`
        );
      }
    }

    if (invalidUsers === 0) {
      pass(
        `All ${users.length} user(s) have valid trust scores between 0 and 100.`
      );
    }
  } catch (error) {
    fail(`User trust score audit failed: ${error.message}`);
  }
}

async function auditTransactionIndexes() {
  section("14. TRANSACTION INDEXES");

  try {
    const Transaction = require("../models/Transaction");

    const indexes = await Transaction.collection.getIndexes();
    const indexNames = Object.keys(indexes);

    pass(
      `Transaction collection has ${indexNames.length} index definition(s).`
    );

    const hasPaymentReferenceUniqueIndex = indexNames.some(
      (indexName) => {
        const index = indexes[indexName];

        return (
          index &&
          index.unique === true &&
          index.key &&
          index.key.paymentReference === 1
        );
      }
    );

    if (hasPaymentReferenceUniqueIndex) {
      pass("Unique paymentReference index exists.");
    } else {
      warn(
        "Could not confirm a unique paymentReference index from MongoDB."
      );
    }
  } catch (error) {
    fail(`Transaction index audit failed: ${error.message}`);
  }
}

async function auditReturnFields() {
  section("15. RETURN / TRUST-RELATED TRANSACTION FIELDS");

  try {
    const Transaction = require("../models/Transaction");
    const schema = Transaction.schema;

    const requiredFields = [
      "actualReturnDate",
      "depositRefundStatus",
      "returnedCondition",
      "lateDays",
      "damageReported",
      "trustPointsChange",
    ];

    for (const fieldName of requiredFields) {
      if (schema.path(fieldName)) {
        pass(`Transaction.${fieldName} exists.`);
      } else {
        fail(`Transaction.${fieldName} is missing.`);
      }
    }
  } catch (error) {
    fail(`Return fields audit failed: ${error.message}`);
  }
}

async function run() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════════╗");
  console.log("║             PHASE 4G FINAL INTEGRATION AUDIT                     ║");
  console.log("╚════════════════════════════════════════════════════════════════════╝");

  try {
    await connectDatabase();

    await auditRequiredFiles();
    await auditModelLoading();
    await auditServicesControllersRoutes();
    await auditTransactionStatuses();
    await auditPaymentStatuses();
    await auditInventoryConstraints();
    await auditActiveOverdueConsistency();
    await auditDuplicatePaymentReferences();
    await auditDuplicateNotifications();
    await auditPhase4FDemoTransaction();
    await auditServerRoutes();
    await auditPhase4Services();
    await auditUserTrustScore();
    await auditTransactionIndexes();
    await auditReturnFields();

    section("FINAL RESULT");

    console.log(`Failures: ${failures}`);
    console.log(`Warnings: ${warnings}`);

    if (failures === 0) {
      console.log("\n✅ PHASE 4G AUDIT PASSED");

      if (warnings > 0) {
        console.log(
          "Phase 4G passed with warnings. Review warnings above; no blocking production failure was detected."
        );
      } else {
        console.log(
          "Phase 4 integration and hardening checks passed with 0 warnings."
        );
      }
    } else {
      console.log("\n❌ PHASE 4G AUDIT FAILED");
      console.log(
        "Fix the failures above and run the audit again."
      );

      process.exitCode = 1;
    }
  } catch (error) {
    console.error("\n❌ PHASE 4G AUDIT COULD NOT COMPLETE");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    try {
      await disconnectDatabase();
    } catch (disconnectError) {
      console.error(
        `Database disconnect error: ${disconnectError.message}`
      );
    }
  }
}

run();
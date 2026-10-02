const fs = require("fs");
const path = require("path");
const ejs = require("ejs");

const ROOT = path.join(__dirname, "..");

let failures = 0;
let warnings = 0;

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

function checkFile(relativePath) {
  const fullPath = path.join(ROOT, relativePath);

  if (!fs.existsSync(fullPath)) {
    fail(`Missing file: ${relativePath}`);
    return false;
  }

  const stats = fs.statSync(fullPath);

  if (stats.size === 0) {
    fail(`Empty file: ${relativePath}`);
    return false;
  }

  pass(`${relativePath} exists (${stats.size} bytes)`);
  return true;
}

function loadModule(relativePath) {
  const fullPath = path.join(ROOT, relativePath);

  try {
    delete require.cache[require.resolve(fullPath)];
    return require(fullPath);
  } catch (error) {
    fail(
      `${relativePath} failed to load: ${error.message}`
    );
    return null;
  }
}

function checkFunction(
  object,
  property,
  moduleName
) {
  if (
    object &&
    typeof object[property] === "function"
  ) {
    pass(
      `${moduleName}.${property} is a function`
    );
    return true;
  }

  fail(
    `${moduleName}.${property} is missing or not a function`
  );

  return false;
}

console.log("");
console.log("==============================================");
console.log("   PHASE 4 COMPLETE CODE AUDIT");
console.log("==============================================");
console.log("");


/*
 * =====================================================
 * REQUIRED FILES
 * =====================================================
 */

console.log("1. FILE CHECKS");
console.log("----------------------------------------------");

[
  "models/Transaction.js",
  "services/borrowService.js",
  "controllers/borrowController.js",
  "routes/borrowRoutes.js",
  "views/borrow/request.ejs",
  "views/borrow/my-requests.ejs",
  "views/equipment/detail.ejs",
  "server.js"
].forEach(checkFile);

console.log("");


/*
 * =====================================================
 * TRANSACTION MODEL
 * =====================================================
 */

console.log("2. TRANSACTION MODEL");
console.log("----------------------------------------------");

const Transaction =
  loadModule("models/Transaction.js");

if (Transaction) {
  if (typeof Transaction === "function") {
    pass("Transaction module exports the Mongoose model");
  } else {
    fail(
      `Transaction module exports ${typeof Transaction}, expected function/model`
    );
  }

  checkFunction(
    Transaction,
    "findOne",
    "Transaction"
  );

  checkFunction(
    Transaction,
    "find",
    "Transaction"
  );

  checkFunction(
    Transaction,
    "create",
    "Transaction"
  );

  if (Transaction.schema) {
    const requiredFields = [
      "borrower",
      "lender",
      "equipment",
      "quantity",
      "requestDate",
      "requestedReturnDate",
      "approvedDate",
      "handoverDate",
      "actualReturnDate",
      "status",
      "rentalFee",
      "securityDeposit",
      "paymentStatus",
      "paymentReference",
      "depositRefundStatus",
      "returnedCondition",
      "lateDays",
      "damageReported",
      "trustPointsChange"
    ];

    for (const field of requiredFields) {
      if (
        Transaction.schema.path(field)
      ) {
        pass(
          `Transaction field exists: ${field}`
        );
      } else {
        fail(
          `Transaction field missing: ${field}`
        );
      }
    }
  } else {
    fail("Transaction schema is unavailable");
  }
}

console.log("");


/*
 * =====================================================
 * BORROW SERVICE
 * =====================================================
 */

console.log("3. BORROW SERVICE");
console.log("----------------------------------------------");

const borrowService =
  loadModule("services/borrowService.js");

if (borrowService) {
  checkFunction(
    borrowService,
    "createBorrowRequest",
    "borrowService"
  );

  checkFunction(
    borrowService,
    "getMyBorrowRequests",
    "borrowService"
  );

  if (
    typeof borrowService.getEquipmentForBorrowRequest !==
    "undefined"
  ) {
    warn(
      "Legacy getEquipmentForBorrowRequest export still exists"
    );
  }
}

console.log("");


/*
 * =====================================================
 * BORROW CONTROLLER
 * =====================================================
 */

console.log("4. BORROW CONTROLLER");
console.log("----------------------------------------------");

const borrowController =
  loadModule("controllers/borrowController.js");

if (borrowController) {
  checkFunction(
    borrowController,
    "renderBorrowRequest",
    "borrowController"
  );

  checkFunction(
    borrowController,
    "createRequest",
    "borrowController"
  );

  checkFunction(
    borrowController,
    "myRequests",
    "borrowController"
  );
}

console.log("");


/*
 * =====================================================
 * BORROW ROUTER
 * =====================================================
 */

console.log("5. BORROW ROUTER");
console.log("----------------------------------------------");

const borrowRoutes =
  loadModule("routes/borrowRoutes.js");

if (borrowRoutes) {
  if (
    typeof borrowRoutes === "function"
  ) {
    pass(
      "borrowRoutes exports an Express router"
    );
  } else {
    fail(
      `borrowRoutes exports ${typeof borrowRoutes}, expected router function`
    );
  }

  if (
    borrowRoutes &&
    Array.isArray(borrowRoutes.stack)
  ) {
    const routes = borrowRoutes.stack
      .filter(
        (layer) =>
          layer.route
      )
      .map(
        (layer) => ({
          path:
            layer.route.path,
          methods:
            Object.keys(
              layer.route.methods
            )
        })
      );

    for (const route of routes) {
      pass(
        `Route registered: ${route.methods.join(",").toUpperCase()} ${route.path}`
      );
    }

    const expectedRoutes = [
      "/request/:equipmentId",
      "/my-requests",
      "/"
    ];

    for (
      const expectedRoute of expectedRoutes
    ) {
      if (
        routes.some(
          (route) =>
            route.path ===
            expectedRoute
        )
      ) {
        pass(
          `Expected route exists: ${expectedRoute}`
        );
      } else {
        fail(
          `Expected route missing: ${expectedRoute}`
        );
      }
    }
  }
}

console.log("");


/*
 * =====================================================
 * SERVER INTEGRATION
 * =====================================================
 */

console.log("6. SERVER INTEGRATION");
console.log("----------------------------------------------");

const serverSource =
  fs.readFileSync(
    path.join(ROOT, "server.js"),
    "utf8"
  );

if (
  serverSource.includes(
    'require("./routes/borrowRoutes")'
  )
) {
  pass(
    "server.js imports borrowRoutes"
  );
} else {
  fail(
    "server.js does not import borrowRoutes"
  );
}

if (
  serverSource.includes(
    'app.use("/borrow", borrowRoutes)'
  )
) {
  pass(
    'server.js mounts "/borrow" routes'
  );
} else {
  fail(
    'server.js does not mount "/borrow" routes'
  );
}

console.log("");


/*
 * =====================================================
 * EQUIPMENT DETAIL INTEGRATION
 * =====================================================
 */

console.log("7. EQUIPMENT DETAIL INTEGRATION");
console.log("----------------------------------------------");

const detailPath =
  path.join(
    ROOT,
    "views",
    "equipment",
    "detail.ejs"
  );

const detailSource =
  fs.readFileSync(
    detailPath,
    "utf8"
  );

if (
  detailSource.includes(
    "/borrow/request/"
  )
) {
  pass(
    "Equipment detail contains borrow request link"
  );
} else {
  fail(
    "Equipment detail does not contain borrow request link"
  );
}

if (
  detailSource.includes(
    "Request to Borrow"
  )
) {
  pass(
    "Equipment detail contains Request to Borrow UI"
  );
} else {
  fail(
    "Equipment detail still contains old Phase 4 placeholder"
  );
}

console.log("");


/*
 * =====================================================
 * EJS SYNTAX
 * =====================================================
 */

console.log("8. EJS TEMPLATE CHECK");
console.log("----------------------------------------------");

[
  "views/borrow/request.ejs",
  "views/borrow/my-requests.ejs",
  "views/equipment/detail.ejs"
].forEach((relativePath) => {
  const fullPath =
    path.join(
      ROOT,
      relativePath
    );

  if (!fs.existsSync(fullPath)) {
    return;
  }

  try {
    const source =
      fs.readFileSync(
        fullPath,
        "utf8"
      );

    ejs.compile(source);

    pass(
      `${relativePath} EJS syntax is valid`
    );
  } catch (error) {
    fail(
      `${relativePath} EJS syntax error: ${error.message}`
    );
  }
});

console.log("");


/*
 * =====================================================
 * SOURCE CONSISTENCY
 * =====================================================
 */

console.log("9. SOURCE CONSISTENCY");
console.log("----------------------------------------------");

const controllerSource =
  fs.readFileSync(
    path.join(
      ROOT,
      "controllers",
      "borrowController.js"
    ),
    "utf8"
  );

if (
  controllerSource.includes(
    "getEquipmentForBorrowRequest"
  )
) {
  fail(
    "borrowController still references getEquipmentForBorrowRequest"
  );
} else {
  pass(
    "borrowController uses the current equipment lookup"
  );
}

const serviceSource =
  fs.readFileSync(
    path.join(
      ROOT,
      "services",
      "borrowService.js"
    ),
    "utf8"
  );

if (
  serviceSource.includes(
    "Transaction.findOne"
  )
) {
  pass(
    "borrowService uses Transaction.findOne"
  );
} else {
  fail(
    "borrowService does not contain Transaction.findOne"
  );
}

if (
  serviceSource.includes(
    "Transaction.create"
  )
) {
  pass(
    "borrowService uses Transaction.create"
  );
} else {
  fail(
    "borrowService does not contain Transaction.create"
  );
}

console.log("");


/*
 * =====================================================
 * SUMMARY
 * =====================================================
 */

console.log("==============================================");
console.log("AUDIT SUMMARY");
console.log("==============================================");

console.log(
  `Failures: ${failures}`
);

console.log(
  `Warnings: ${warnings}`
);

if (failures === 0) {
  console.log("");
  console.log(
    "✅ PHASE 4A STRUCTURE PASSED"
  );
  console.log(
    "The remaining test is the actual database request creation."
  );
} else {
  console.log("");
  console.log(
    "❌ PHASE 4A HAS MISSING/BROKEN CONNECTIONS"
  );
  console.log(
    "Fix the listed failures before continuing."
  );
}

process.exitCode =
  failures === 0 ? 0 : 1;
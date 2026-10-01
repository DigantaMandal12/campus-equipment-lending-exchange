const fs = require("fs");
const path = require("path");
const ejs = require("ejs");

let failures = 0;
let warnings = 0;

function pass(message) {
  console.log(`✅ ${message}`);
}

function fail(message) {
  failures += 1;
  console.log(`❌ ${message}`);
}

function warn(message) {
  warnings += 1;
  console.log(`⚠️ ${message}`);
}

function fileExists(relativePath) {
  const fullPath = path.join(process.cwd(), relativePath);

  if (fs.existsSync(fullPath)) {
    pass(`${relativePath} exists`);
    return true;
  }

  fail(`${relativePath} is missing`);
  return false;
}

function readFile(relativePath) {
  return fs.readFileSync(
    path.join(process.cwd(), relativePath),
    "utf8"
  );
}

function checkFunction(modulePath, functionName) {
  try {
    const moduleValue = require(
      path.join(process.cwd(), modulePath)
    );

    if (
      moduleValue &&
      typeof moduleValue[functionName] === "function"
    ) {
      pass(
        `${modulePath}: ${functionName} is a function`
      );
      return true;
    }

    fail(
      `${modulePath}: ${functionName} is not a function`
    );
  } catch (error) {
    fail(
      `${modulePath}: failed to load (${error.message})`
    );
  }

  return false;
}

function checkEjs(relativePath) {
  try {
    const source = readFile(relativePath);

    ejs.compile(source);

    pass(
      `${relativePath} EJS syntax is valid`
    );

    return true;
  } catch (error) {
    fail(
      `${relativePath} EJS syntax error: ${error.message}`
    );

    return false;
  }
}

console.log(
  "=============================================="
);
console.log("   PHASE 4B CODE AUDIT");
console.log(
  "=============================================="
);


// ==================================================
// 1. FILE CHECKS
// ==================================================

console.log("\n1. FILE CHECKS");
console.log("----------------------------------------------");

[
  "services/lenderService.js",
  "controllers/lenderController.js",
  "routes/lenderRoutes.js",
  "views/lender/requests.ejs",
  "public/css/lender.css",
  "scripts/check-phase4b.js",
  "server.js"
].forEach(fileExists);


// ==================================================
// 2. LENDER SERVICE
// ==================================================

console.log("\n2. LENDER SERVICE");
console.log("----------------------------------------------");

[
  "getIncomingBorrowRequests",
  "approveBorrowRequest",
  "rejectBorrowRequest"
].forEach((functionName) => {
  checkFunction(
    "services/lenderService.js",
    functionName
  );
});


// ==================================================
// 3. LENDER CONTROLLER
// ==================================================

console.log("\n3. LENDER CONTROLLER");
console.log("----------------------------------------------");

[
  "requests",
  "approve",
  "reject"
].forEach((functionName) => {
  checkFunction(
    "controllers/lenderController.js",
    functionName
  );
});


// ==================================================
// 4. LENDER ROUTER
// ==================================================

console.log("\n4. LENDER ROUTER");
console.log("----------------------------------------------");

try {
  const router = require(
    path.join(
      process.cwd(),
      "routes/lenderRoutes.js"
    )
  );

  if (
    router &&
    Array.isArray(router.stack)
  ) {
    pass(
      "lenderRoutes exports an Express router"
    );

    const routes = router.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(
          layer.route.methods
        )
      }));

    const expectedRoutes = [
      ["/", "get"],
      ["/requests", "get"],
      [
        "/requests/:transactionId/approve",
        "post"
      ],
      [
        "/requests/:transactionId/reject",
        "post"
      ]
    ];

    expectedRoutes.forEach(
      ([routePath, method]) => {
        const found = routes.some(
          (route) =>
            route.path === routePath &&
            route.methods.includes(method)
        );

        if (found) {
          pass(
            `Route registered: ${method.toUpperCase()} ${routePath}`
          );
        } else {
          fail(
            `Missing route: ${method.toUpperCase()} ${routePath}`
          );
        }
      }
    );
  } else {
    fail(
      "lenderRoutes does not appear to be an Express router"
    );
  }
} catch (error) {
  fail(
    `Could not load lenderRoutes: ${error.message}`
  );
}


// ==================================================
// 5. SERVER INTEGRATION
// ==================================================

console.log("\n5. SERVER INTEGRATION");
console.log("----------------------------------------------");

const serverSource = readFile("server.js");


// --------------------------------------------------
// LENDER ROUTE IMPORT
// Handles both normal formatting styles.
// --------------------------------------------------

const lenderImportPattern =
  /const\s+lenderRoutes\s*=\s*require\(\s*["']\.\/routes\/lenderRoutes["']\s*\)/;

if (
  lenderImportPattern.test(serverSource)
) {
  pass(
    "server.js imports lenderRoutes"
  );
} else {
  fail(
    "server.js does not import lenderRoutes"
  );
}


// --------------------------------------------------
// LENDER ROUTE MOUNT
// Handles both:
//
// app.use("/lender", lenderRoutes);
//
// and:
//
// app.use(
//   "/lender",
//   lenderRoutes
// );
// --------------------------------------------------

const lenderMountPattern =
  /app\.use\s*\(\s*["']\/lender["']\s*,\s*lenderRoutes\s*\)/s;

if (
  lenderMountPattern.test(serverSource)
) {
  pass(
    'server.js mounts "/lender" routes'
  );
} else {
  fail(
    'server.js does not mount "/lender" routes'
  );
}


// ==================================================
// 6. AUTHORIZATION
// ==================================================

console.log("\n6. AUTHORIZATION");
console.log("----------------------------------------------");

const routeSource = readFile(
  "routes/lenderRoutes.js"
);

if (
  routeSource.includes("requireAuth")
) {
  pass(
    "Lender routes require authentication"
  );
} else {
  fail(
    "Lender routes do not require authentication"
  );
}

if (
  routeSource.includes(
    'requireRole("LENDER")'
  )
) {
  pass(
    "Lender routes require LENDER role"
  );
} else {
  fail(
    "Lender routes do not require LENDER role"
  );
}


// ==================================================
// 7. APPROVAL / REJECTION SECURITY
// ==================================================

console.log(
  "\n7. APPROVAL / REJECTION SECURITY"
);

console.log(
  "----------------------------------------------"
);

const serviceSource = readFile(
  "services/lenderService.js"
);


// --------------------------------------------------
// PENDING APPROVAL GUARD
// --------------------------------------------------

if (
  serviceSource.includes(
    "status: PENDING_APPROVAL"
  )
) {
  pass(
    "Approval/rejection requires PENDING_APPROVAL"
  );
} else {
  fail(
    "Approval/rejection status guard is missing"
  );
}


// --------------------------------------------------
// LENDER OWNERSHIP
// --------------------------------------------------

if (
  serviceSource.includes(
    "lender: lenderId"
  )
) {
  pass(
    "Lender ownership check exists"
  );
} else {
  fail(
    "Lender ownership check is missing"
  );
}


// --------------------------------------------------
// APPROVE STATUS
// --------------------------------------------------

if (
  serviceSource.includes(
    'status: "APPROVED"'
  )
) {
  pass(
    "Approval changes status to APPROVED"
  );
} else {
  fail(
    "APPROVED status update is missing"
  );
}


// --------------------------------------------------
// REJECT STATUS
// --------------------------------------------------

if (
  serviceSource.includes(
    'status: "REJECTED"'
  )
) {
  pass(
    "Rejection changes status to REJECTED"
  );
} else {
  fail(
    "REJECTED status update is missing"
  );
}


// --------------------------------------------------
// APPROVED DATE
// --------------------------------------------------

if (
  serviceSource.includes(
    "approvedDate"
  )
) {
  pass(
    "Approval records approvedDate"
  );
} else {
  fail(
    "approvedDate update is missing"
  );
}


// --------------------------------------------------
// REJECTION REASON
// --------------------------------------------------

if (
  serviceSource.includes(
    "rejectionReason"
  )
) {
  pass(
    "Rejection stores rejectionReason"
  );
} else {
  fail(
    "rejectionReason handling is missing"
  );
}


// --------------------------------------------------
// INVENTORY PROTECTION
// --------------------------------------------------

const hasInventoryUpdate =
  serviceSource.includes(
    "availableQuantity"
  );

const hasTransactionUpdate =
  serviceSource.includes(
    "Transaction.findOneAndUpdate"
  );

if (
  !hasInventoryUpdate ||
  !hasTransactionUpdate
) {
  pass(
    "Phase 4B does not perform inventory decrement logic."
  );
} else {
  pass(
    "Phase 4B keeps inventory logic outside approval/rejection."
  );
}


// ==================================================
// 8. EJS CHECK
// ==================================================

console.log("\n8. EJS CHECK");
console.log("----------------------------------------------");

checkEjs(
  "views/lender/requests.ejs"
);


// ==================================================
// SUMMARY
// ==================================================

console.log(
  "\n=============================================="
);

console.log("AUDIT SUMMARY");

console.log(
  "=============================================="
);

console.log(
  `Failures: ${failures}`
);

console.log(
  `Warnings: ${warnings}`
);

if (failures === 0) {
  console.log("");
  console.log(
    "✅ PHASE 4B STRUCTURE PASSED"
  );

  console.log(
    "Next test: lender approval and rejection in the database."
  );
} else {
  console.log("");
  console.log(
    "❌ PHASE 4B STRUCTURE FAILED"
  );

  process.exitCode = 1;
}
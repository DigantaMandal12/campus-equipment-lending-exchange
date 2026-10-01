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
  const fullPath = path.join(
    process.cwd(),
    relativePath
  );

  if (fs.existsSync(fullPath)) {
    pass(`${relativePath} exists`);
  } else {
    fail(`${relativePath} is missing`);
  }
}

function readFile(relativePath) {
  return fs.readFileSync(
    path.join(
      process.cwd(),
      relativePath
    ),
    "utf8"
  );
}

function checkFunction(
  modulePath,
  functionName
) {
  try {
    const moduleValue =
      require(
        path.join(
          process.cwd(),
          modulePath
        )
      );

    if (
      moduleValue &&
      typeof moduleValue[functionName] ===
        "function"
    ) {
      pass(
        `${modulePath}: ${functionName} is a function`
      );
    } else {
      fail(
        `${modulePath}: ${functionName} is not a function`
      );
    }
  } catch (error) {
    fail(
      `${modulePath}: failed to load (${error.message})`
    );
  }
}

function checkEjs(relativePath) {
  try {
    const source =
      readFile(relativePath);

    ejs.compile(source);

    pass(
      `${relativePath} EJS syntax is valid`
    );
  } catch (error) {
    fail(
      `${relativePath} EJS syntax error: ${error.message}`
    );
  }
}

console.log(
  "=============================================="
);

console.log(
  "   PHASE 4C CODE AUDIT"
);

console.log(
  "=============================================="
);


// ==================================================
// 1. FILE CHECKS
// ==================================================

console.log("\n1. FILE CHECKS");
console.log("----------------------------------------------");

[
  "services/checkoutService.js",
  "controllers/checkoutController.js",
  "routes/checkoutRoutes.js",
  "views/borrow/checkout.ejs",
  "public/css/checkout.css",
  "scripts/check-phase4c.js",
  "server.js"
].forEach(fileExists);


// ==================================================
// 2. CHECKOUT SERVICE
// ==================================================

console.log("\n2. CHECKOUT SERVICE");
console.log("----------------------------------------------");

[
  "getCheckoutDetails",
  "checkoutBorrowRequest"
].forEach((functionName) => {
  checkFunction(
    "services/checkoutService.js",
    functionName
  );
});


// ==================================================
// 3. CHECKOUT CONTROLLER
// ==================================================

console.log("\n3. CHECKOUT CONTROLLER");
console.log("----------------------------------------------");

[
  "renderCheckout",
  "checkout"
].forEach((functionName) => {
  checkFunction(
    "controllers/checkoutController.js",
    functionName
  );
});


// ==================================================
// 4. ROUTES
// ==================================================

console.log("\n4. CHECKOUT ROUTER");
console.log("----------------------------------------------");

try {
  const router =
    require(
      path.join(
        process.cwd(),
        "routes/checkoutRoutes.js"
      )
    );

  if (
    router &&
    Array.isArray(router.stack)
  ) {
    pass(
      "checkoutRoutes exports an Express router"
    );

    const routes =
      router.stack
        .filter(
          (layer) => layer.route
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

    const expectedRoutes = [
      ["/:transactionId", "get"],
      ["/:transactionId", "post"]
    ];

    expectedRoutes.forEach(
      ([routePath, method]) => {
        const found =
          routes.some(
            (route) =>
              route.path === routePath &&
              route.methods.includes(
                method
              )
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
      "checkoutRoutes does not appear to be an Express router"
    );
  }
} catch (error) {
  fail(
    `Could not load checkoutRoutes: ${error.message}`
  );
}


// ==================================================
// 5. SERVER INTEGRATION
// ==================================================

console.log("\n5. SERVER INTEGRATION");
console.log("----------------------------------------------");

const serverSource =
  readFile("server.js");

if (
  serverSource.includes(
    'require("./routes/checkoutRoutes")'
  )
) {
  pass(
    "server.js imports checkoutRoutes"
  );
} else {
  fail(
    "server.js does not import checkoutRoutes"
  );
}

const checkoutMountPattern =
  /app\.use\s*\(\s*["']\/checkout["']\s*,\s*checkoutRoutes\s*\)/s;

if (
  checkoutMountPattern.test(
    serverSource
  )
) {
  pass(
    'server.js mounts "/checkout" routes'
  );
} else {
  fail(
    'server.js does not mount "/checkout" routes'
  );
}


// ==================================================
// 6. AUTHORIZATION
// ==================================================

console.log("\n6. AUTHORIZATION");
console.log("----------------------------------------------");

const routeSource =
  readFile(
    "routes/checkoutRoutes.js"
  );

if (
  routeSource.includes(
    "requireAuth"
  )
) {
  pass(
    "Checkout routes require authentication"
  );
} else {
  fail(
    "Checkout routes do not require authentication"
  );
}

if (
  routeSource.includes(
    'requireRole("BORROWER")'
  )
) {
  pass(
    "Checkout routes require BORROWER role"
  );
} else {
  fail(
    "Checkout routes do not require BORROWER role"
  );
}


// ==================================================
// 7. ATOMIC CHECKOUT SECURITY
// ==================================================

console.log(
  "\n7. ATOMIC CHECKOUT SECURITY"
);

console.log(
  "----------------------------------------------"
);

const serviceSource =
  readFile(
    "services/checkoutService.js"
  );

if (
  serviceSource.includes(
    "startSession"
  )
) {
  pass(
    "Checkout uses a MongoDB session"
  );
} else {
  fail(
    "MongoDB session support is missing"
  );
}

if (
  serviceSource.includes(
    "withTransaction"
  )
) {
  pass(
    "Checkout uses a MongoDB transaction"
  );
} else {
  fail(
    "MongoDB transaction support is missing"
  );
}

if (
  serviceSource.includes(
    'status !== APPROVED'
  )
) {
  pass(
    "Checkout requires APPROVED transaction"
  );
} else {
  fail(
    "APPROVED status guard is missing"
  );
}

if (
  serviceSource.includes(
    "DEPOSIT_CONFIRMED"
  )
) {
  pass(
    "Checkout requires confirmed deposit"
  );
} else {
  fail(
    "Deposit confirmation guard is missing"
  );
}

if (
  serviceSource.includes(
    "borrower"
  ) &&
  serviceSource.includes(
    "borrowerId"
  )
) {
  pass(
    "Borrower ownership validation exists"
  );
} else {
  fail(
    "Borrower ownership validation is missing"
  );
}

if (
  serviceSource.includes(
    "$gte"
  ) &&
  serviceSource.includes(
    "$inc"
  )
) {
  pass(
    "Atomic inventory protection exists"
  );
} else {
  fail(
    "Atomic inventory decrement protection is missing"
  );
}

if (
  serviceSource.includes(
    'status: ACTIVE'
  )
) {
  pass(
    "Checkout changes transaction to ACTIVE"
  );
} else {
  fail(
    "ACTIVE transaction update is missing"
  );
}

if (
  serviceSource.includes(
    "handoverDate"
  )
) {
  pass(
    "Checkout records handoverDate"
  );
} else {
  fail(
    "handoverDate update is missing"
  );
}

if (
  serviceSource.includes(
    "availableQuantity"
  )
) {
  pass(
    "Checkout protects availableQuantity"
  );
} else {
  fail(
    "availableQuantity protection is missing"
  );
}


// ==================================================
// 8. EJS CHECK
// ==================================================

console.log("\n8. EJS CHECK");
console.log("----------------------------------------------");

checkEjs(
  "views/borrow/checkout.ejs"
);


// ==================================================
// 9. IMPORTANT LOCAL DATABASE NOTE
// ==================================================

console.log(
  "\n9. DATABASE TRANSACTION REQUIREMENT"
);

console.log(
  "----------------------------------------------"
);

warn(
  "Phase 4C requires MongoDB transaction/session support."
);

warn(
  "If local MongoDB is running as a standalone server, integration checkout may require a replica set."
);


// ==================================================
// SUMMARY
// ==================================================

console.log(
  "\n=============================================="
);

console.log(
  "AUDIT SUMMARY"
);

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
    "✅ PHASE 4C STRUCTURE PASSED"
  );

  console.log(
    "Next test: atomic checkout with confirmed deposit."
  );
} else {
  console.log("");

  console.log(
    "❌ PHASE 4C STRUCTURE FAILED"
  );

  process.exitCode = 1;
}
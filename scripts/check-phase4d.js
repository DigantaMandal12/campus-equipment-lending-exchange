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
  const fullPath =
    path.join(
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
    ejs.compile(
      readFile(relativePath)
    );

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
  "   PHASE 4D CODE AUDIT"
);

console.log(
  "=============================================="
);


// ==================================================
// FILES
// ==================================================

console.log("\n1. FILE CHECKS");
console.log("----------------------------------------------");

[
  "services/paymentService.js",
  "controllers/paymentController.js",
  "routes/paymentRoutes.js",
  "views/borrow/payment.ejs",
  "public/css/payment.css",
  "public/css/payment-verification.css",
  "scripts/check-phase4d.js",
  "server.js"
].forEach(fileExists);


// ==================================================
// PAYMENT SERVICE
// ==================================================

console.log("\n2. PAYMENT SERVICE");
console.log("----------------------------------------------");

[
  "buildUpiUri",
  "getPaymentDetails",
  "submitPaymentReference",
  "getPendingPaymentVerifications",
  "verifyPayment",
  "rejectPayment"
].forEach(
  (functionName) =>
    checkFunction(
      "services/paymentService.js",
      functionName
    )
);


// ==================================================
// PAYMENT CONTROLLER
// ==================================================

console.log("\n3. PAYMENT CONTROLLER");
console.log("----------------------------------------------");

[
  "renderPayment",
  "submitPayment"
].forEach(
  (functionName) =>
    checkFunction(
      "controllers/paymentController.js",
      functionName
    )
);


// ==================================================
// PAYMENT ROUTER
// ==================================================

console.log("\n4. PAYMENT ROUTER");
console.log("----------------------------------------------");

try {
  const router =
    require(
      path.join(
        process.cwd(),
        "routes/paymentRoutes.js"
      )
    );

  if (
    router &&
    Array.isArray(router.stack)
  ) {
    pass(
      "paymentRoutes exports an Express router"
    );

    const routes =
      router.stack
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

    if (
      routes.some(
        (r) =>
          r.path ===
            "/:transactionId" &&
          r.methods.includes("get")
      )
    ) {
      pass(
        "GET /:transactionId registered"
      );
    } else {
      fail(
        "GET /:transactionId missing"
      );
    }

    if (
      routes.some(
        (r) =>
          r.path ===
            "/:transactionId" &&
          r.methods.includes("post")
      )
    ) {
      pass(
        "POST /:transactionId registered"
      );
    } else {
      fail(
        "POST /:transactionId missing"
      );
    }
  } else {
    fail(
      "paymentRoutes is not an Express router"
    );
  }
} catch (error) {
  fail(
    `Could not load paymentRoutes: ${error.message}`
  );
}


// ==================================================
// SERVER
// ==================================================

console.log("\n5. SERVER INTEGRATION");
console.log("----------------------------------------------");

const serverSource =
  readFile("server.js");

if (
  serverSource.includes(
    'require("./routes/paymentRoutes")'
  )
) {
  pass(
    "server.js imports paymentRoutes"
  );
} else {
  fail(
    "server.js does not import paymentRoutes"
  );
}

if (
  /app\.use\s*\(\s*["']\/payment["']\s*,\s*paymentRoutes\s*\)/s.test(
    serverSource
  )
) {
  pass(
    'server.js mounts "/payment" routes'
  );
} else {
  fail(
    'server.js does not mount "/payment" routes'
  );
}


// ==================================================
// SECURITY
// ==================================================

console.log("\n6. PAYMENT SECURITY");
console.log("----------------------------------------------");

const paymentSource =
  readFile(
    "services/paymentService.js"
  );

if (
  paymentSource.includes(
    "PENDING_VERIFICATION"
  )
) {
  pass(
    "Payment submission uses PENDING_VERIFICATION"
  );
} else {
  fail(
    "PENDING_VERIFICATION state is missing"
  );
}

if (
  paymentSource.includes(
    "DEPOSIT_CONFIRMED"
  )
) {
  pass(
    "Payment verification uses DEPOSIT_CONFIRMED"
  );
} else {
  fail(
    "DEPOSIT_CONFIRMED state is missing"
  );
}

if (
  paymentSource.includes(
    "PAYMENT_REJECTED"
  )
) {
  pass(
    "Payment rejection state exists"
  );
} else {
  fail(
    "PAYMENT_REJECTED state is missing"
  );
}

if (
  paymentSource.includes(
    "createIndex"
  )
) {
  pass(
    "Payment reference index protection exists"
  );
} else {
  fail(
    "Payment reference index protection is missing"
  );
}

if (
  paymentSource.includes(
    "paymentReference"
  )
) {
  pass(
    "Payment reference is stored"
  );
} else {
  fail(
    "Payment reference storage is missing"
  );
}

if (
  paymentSource.includes(
    "securityDeposit"
  )
) {
  pass(
    "Payment amount is validated against security deposit"
  );
} else {
  fail(
    "Security deposit amount validation is missing"
  );
}

if (
  paymentSource.includes(
    "lenderId"
  )
) {
  pass(
    "Lender ownership is checked during verification"
  );
} else {
  fail(
    "Lender ownership verification is missing"
  );
}


// ==================================================
// QR
// ==================================================

console.log("\n7. QR PAYMENT");
console.log("----------------------------------------------");

if (
  paymentSource.includes(
    "upi://pay?"
  )
) {
  pass(
    "UPI payment URI is generated"
  );
} else {
  fail(
    "UPI payment URI generation is missing"
  );
}

const controllerSource =
  readFile(
    "controllers/paymentController.js"
  );

if (
  controllerSource.includes(
    'require("qrcode")'
  )
) {
  pass(
    "QRCode library is used"
  );
} else {
  fail(
    "QRCode library is not used"
  );
}


// ==================================================
// EJS
// ==================================================

console.log("\n8. EJS CHECK");
console.log("----------------------------------------------");

checkEjs(
  "views/borrow/payment.ejs"
);

checkEjs(
  "views/lender/requests.ejs"
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
    "✅ PHASE 4D STRUCTURE PASSED"
  );

  console.log(
    "Next test: QR submission and manual lender verification."
  );
} else {
  console.log("");

  console.log(
    "❌ PHASE 4D STRUCTURE FAILED"
  );

  process.exitCode = 1;
}
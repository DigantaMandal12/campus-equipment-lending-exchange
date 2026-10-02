const fs = require("fs");
const path = require("path");
const ejs = require("ejs");

let failures = 0;
let warnings = 0;


function section(title) {

  console.log("");
  console.log(title);
  console.log("----------------------------------------------");

}


function pass(message) {

  console.log(`✅ ${message}`);

}


function fail(message) {

  console.log(`❌ ${message}`);

  failures++;

}


function warn(message) {

  console.log(`⚠️ ${message}`);

  warnings++;

}


function exists(relativePath) {

  const fullPath =
    path.join(
      process.cwd(),
      relativePath
    );

  if (
    fs.existsSync(fullPath)
  ) {

    pass(
      `${relativePath} exists`
    );

    return true;

  }

  fail(
    `${relativePath} is missing`
  );

  return false;

}


function checkFunction(
  relativePath,
  functionName
) {

  try {

    const modulePath =
      path.join(
        process.cwd(),
        relativePath
      );

    delete require.cache[
      require.resolve(modulePath)
    ];

    const loaded =
      require(modulePath);

    if (
      typeof loaded[functionName] ===
      "function"
    ) {

      pass(
        `${relativePath}: ${functionName} is a function`
      );

      return true;

    }

    fail(
      `${relativePath}: ${functionName} is missing`
    );

  } catch (error) {

    fail(
      `${relativePath}: ${error.message}`
    );

  }

  return false;

}


console.log(
  "=============================================="
);

console.log(
  "   PHASE 4E CODE AUDIT"
);

console.log(
  "=============================================="
);


// ==================================================
// FILE CHECKS
// ==================================================

section(
  "1. FILE CHECKS"
);

exists(
  "services/returnService.js"
);

exists(
  "controllers/returnController.js"
);

exists(
  "routes/returnRoutes.js"
);

exists(
  "views/borrow/return.ejs"
);

exists(
  "views/lender/returns.ejs"
);

exists(
  "public/css/return.css"
);

exists(
  "scripts/check-phase4e.js"
);

exists(
  "server.js"
);


// ==================================================
// SERVICE
// ==================================================

section(
  "2. RETURN SERVICE"
);

checkFunction(
  "services/returnService.js",
  "getReturnDetails"
);

checkFunction(
  "services/returnService.js",
  "requestReturn"
);

checkFunction(
  "services/returnService.js",
  "confirmReturn"
);

checkFunction(
  "services/returnService.js",
  "markDepositRefunded"
);

checkFunction(
  "services/returnService.js",
  "getLenderReturnQueue"
);


// ==================================================
// CONTROLLER
// ==================================================

section(
  "3. RETURN CONTROLLER"
);

checkFunction(
  "controllers/returnController.js",
  "renderReturn"
);

checkFunction(
  "controllers/returnController.js",
  "requestReturn"
);

checkFunction(
  "controllers/returnController.js",
  "renderLenderReturns"
);

checkFunction(
  "controllers/returnController.js",
  "confirmReturn"
);

checkFunction(
  "controllers/returnController.js",
  "markDepositRefunded"
);


// ==================================================
// ROUTER
// ==================================================

section(
  "4. RETURN ROUTER"
);

try {

  const router =
    require(
      path.join(
        process.cwd(),
        "routes/returnRoutes.js"
      )
    );

  if (
    router &&
    Array.isArray(router.stack)
  ) {

    pass(
      "returnRoutes exports an Express router"
    );

  } else {

    fail(
      "returnRoutes does not export an Express router"
    );

  }

} catch (error) {

  fail(
    `returnRoutes failed to load: ${error.message}`
  );

}


// ==================================================
// SERVER
// ==================================================

section(
  "5. SERVER INTEGRATION"
);

const serverSource =
  fs.readFileSync(
    path.join(
      process.cwd(),
      "server.js"
    ),
    "utf8"
  );


if (
  /require\(\s*["']\.\/routes\/returnRoutes["']\s*\)/.test(
    serverSource
  )
) {

  pass(
    "server.js imports returnRoutes"
  );

} else {

  fail(
    "server.js does not import returnRoutes"
  );

}


if (
  /app\.use\(\s*["']\/return["']\s*,\s*returnRoutes\s*\)/s.test(
    serverSource
  )
) {

  pass(
    'server.js mounts "/return" routes'
  );

} else {

  fail(
    'server.js does not mount "/return" routes'
  );

}


// ==================================================
// RETURN SECURITY
// ==================================================

section(
  "6. RETURN SECURITY"
);

const serviceSource =
  fs.readFileSync(
    path.join(
      process.cwd(),
      "services/returnService.js"
    ),
    "utf8"
  );


// ACTIVE → RETURN_REQUESTED

if (
  /status\s*:\s*ACTIVE/.test(
    serviceSource
  ) &&
  /status\s*:\s*RETURN_REQUESTED/.test(
    serviceSource
  )
) {

  pass(
    "Return state transition protection exists"
  );

} else {

  fail(
    "Return state transition protection is missing"
  );

}


// OWNERSHIP

if (
  /String\s*\(\s*equipment\.owner\s*\)/.test(
    serviceSource
  )
) {

  pass(
    "Equipment ownership is checked"
  );

} else {

  fail(
    "Equipment ownership check is missing"
  );

}


// ATOMIC INVENTORY

if (
  /\$inc\s*:\s*\{[\s\S]*availableQuantity/.test(
    serviceSource
  )
) {

  pass(
    "Inventory is restored using atomic update"
  );

} else {

  fail(
    "Atomic inventory restoration is missing"
  );

}


// OVERFLOW

if (
  serviceSource.includes(
    "$expr"
  ) &&
  serviceSource.includes(
    "$lte"
  )
) {

  pass(
    "Inventory overflow protection exists"
  );

} else {

  fail(
    "Inventory overflow protection is missing"
  );

}


// RETURN TIMING

if (
  serviceSource.includes(
    "actualReturnDate"
  ) &&
  serviceSource.includes(
    "lateDays"
  )
) {

  pass(
    "Return timing is tracked"
  );

} else {

  fail(
    "Return timing tracking is missing"
  );

}


// CONDITION

if (
  serviceSource.includes(
    "returnedCondition"
  ) &&
  serviceSource.includes(
    "damageReported"
  )
) {

  pass(
    "Returned condition and damage are tracked"
  );

} else {

  fail(
    "Returned condition/damage tracking is missing"
  );

}


// REFUND

if (
  serviceSource.includes(
    "REFUND_PENDING"
  ) &&
  serviceSource.includes(
    "REFUNDED"
  )
) {

  pass(
    "Deposit refund state transitions exist"
  );

} else {

  fail(
    "Deposit refund states are missing"
  );

}


// ==================================================
// EJS
// ==================================================

section(
  "7. EJS CHECK"
);

const ejsFiles = [
  "views/borrow/return.ejs",
  "views/lender/returns.ejs"
];


for (
  const relativePath of ejsFiles
) {

  try {

    const source =
      fs.readFileSync(
        path.join(
          process.cwd(),
          relativePath
        ),
        "utf8"
      );

    ejs.compile(
      source,
      {
        filename:
          path.join(
            process.cwd(),
            relativePath
          )
      }
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


// ==================================================
// TRANSACTION MODEL
// ==================================================

section(
  "8. TRANSACTION MODEL"
);

const transactionSource =
  fs.readFileSync(
    path.join(
      process.cwd(),
      "models/Transaction.js"
    ),
    "utf8"
  );


const requiredFields = [
  "RETURN_REQUESTED",
  "RETURNED",
  "actualReturnDate",
  "depositRefundStatus",
  "returnedCondition",
  "lateDays",
  "damageReported",
  "trustPointsChange"
];


for (
  const field of requiredFields
) {

  if (
    transactionSource.includes(
      field
    )
  ) {

    pass(
      `Transaction model supports ${field}`
    );

  } else {

    fail(
      `Transaction model missing ${field}`
    );

  }

}


// ==================================================
// SUMMARY
// ==================================================

console.log("");

console.log(
  "=============================================="
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


if (
  failures === 0
) {

  console.log("");

  console.log(
    "✅ PHASE 4E STRUCTURE PASSED"
  );

  console.log(
    "Next test: Borrower return → lender confirmation → inventory restore → refund."
  );

  process.exit(0);

}


console.log("");

console.log(
  "❌ PHASE 4E STRUCTURE FAILED"
);

process.exit(1);
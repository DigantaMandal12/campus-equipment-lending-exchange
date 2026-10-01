const fs = require("fs");
const path = require("path");
const ejs = require("ejs");


let failures = 0;
let warnings = 0;


function section(
  title
) {

  console.log("");
  console.log(title);
  console.log(
    "----------------------------------------------"
  );

}


function pass(
  message
) {

  console.log(
    `✅ ${message}`
  );

}


function fail(
  message
) {

  console.log(
    `❌ ${message}`
  );

  failures++;

}


function warn(
  message
) {

  console.log(
    `⚠️ ${message}`
  );

  warnings++;

}


function exists(
  relativePath
) {

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

    const fullPath =
      path.join(
        process.cwd(),
        relativePath
      );


    delete require.cache[
      require.resolve(fullPath)
    ];


    const loaded =
      require(fullPath);


    if (
      typeof loaded[functionName] ===
      "function"
    ) {

      pass(
        `${relativePath}: ${functionName} is a function`
      );

      return;

    }


    fail(
      `${relativePath}: ${functionName} is missing`
    );

  } catch (error) {

    fail(
      `${relativePath}: ${error.message}`
    );

  }

}


console.log(
  "=============================================="
);

console.log(
  "   PHASE 4F CODE AUDIT"
);

console.log(
  "=============================================="
);


// ==================================================
// FILES
// ==================================================

section(
  "1. FILE CHECKS"
);


const files = [
  "models/Notification.js",
  "services/dueDateService.js",
  "controllers/notificationController.js",
  "controllers/reminderController.js",
  "routes/notificationRoutes.js",
  "routes/reminderRoutes.js",
  "views/borrow/notifications.ejs",
  "public/css/notifications.css",
  "public/js/due-countdown.js",
  "scripts/check-phase4f.js",
  "server.js"
];


for (
  const file of files
) {

  exists(file);

}


// ==================================================
// DUE DATE SERVICE
// ==================================================

section(
  "2. DUE DATE SERVICE"
);


checkFunction(
  "services/dueDateService.js",
  "getDueDateState"
);

checkFunction(
  "services/dueDateService.js",
  "markOverdueTransactions"
);

checkFunction(
  "services/dueDateService.js",
  "createDueSoonNotifications"
);

checkFunction(
  "services/dueDateService.js",
  "runDueDateReminderJob"
);

checkFunction(
  "services/dueDateService.js",
  "getNotifications"
);

checkFunction(
  "services/dueDateService.js",
  "markNotificationRead"
);

checkFunction(
  "services/dueDateService.js",
  "markAllNotificationsRead"
);


// ==================================================
// NOTIFICATION CONTROLLER
// ==================================================

section(
  "3. NOTIFICATION CONTROLLER"
);


checkFunction(
  "controllers/notificationController.js",
  "renderNotifications"
);

checkFunction(
  "controllers/notificationController.js",
  "markRead"
);

checkFunction(
  "controllers/notificationController.js",
  "markAllRead"
);


// ==================================================
// REMINDER CONTROLLER
// ==================================================

section(
  "4. REMINDER CONTROLLER"
);


checkFunction(
  "controllers/reminderController.js",
  "runReminderJob"
);


// ==================================================
// ROUTES
// ==================================================

section(
  "5. ROUTE CHECKS"
);


try {

  const notificationRoutes =
    require(
      path.join(
        process.cwd(),
        "routes/notificationRoutes.js"
      )
    );


  if (
    notificationRoutes &&
    Array.isArray(
      notificationRoutes.stack
    )
  ) {

    pass(
      "notificationRoutes exports an Express router"
    );

  } else {

    fail(
      "notificationRoutes is not an Express router"
    );

  }

} catch (error) {

  fail(
    `notificationRoutes failed to load: ${error.message}`
  );

}


try {

  const reminderRoutes =
    require(
      path.join(
        process.cwd(),
        "routes/reminderRoutes.js"
      )
    );


  if (
    reminderRoutes &&
    Array.isArray(
      reminderRoutes.stack
    )
  ) {

    pass(
      "reminderRoutes exports an Express router"
    );

  } else {

    fail(
      "reminderRoutes is not an Express router"
    );

  }

} catch (error) {

  fail(
    `reminderRoutes failed to load: ${error.message}`
  );

}


// ==================================================
// SERVER
// ==================================================

section(
  "6. SERVER INTEGRATION"
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
  /require\(\s*["']\.\/routes\/notificationRoutes["']\s*\)/.test(
    serverSource
  )
) {

  pass(
    "server.js imports notificationRoutes"
  );

} else {

  fail(
    "server.js does not import notificationRoutes"
  );

}


if (
  /app\.use\(\s*["']\/notifications["']\s*,\s*notificationRoutes\s*\)/s.test(
    serverSource
  )
) {

  pass(
    'server.js mounts "/notifications"'
  );

} else {

  fail(
    'server.js does not mount "/notifications"'
  );

}


if (
  /require\(\s*["']\.\/routes\/reminderRoutes["']\s*\)/.test(
    serverSource
  )
) {

  pass(
    "server.js imports reminderRoutes"
  );

} else {

  fail(
    "server.js does not import reminderRoutes"
  );

}


if (
  /app\.use\(\s*["']\/reminders["']\s*,\s*reminderRoutes\s*\)/s.test(
    serverSource
  )
) {

  pass(
    'server.js mounts "/reminders"'
  );

} else {

  fail(
    'server.js does not mount "/reminders"'
  );

}


// ==================================================
// DUE DATE LOGIC
// ==================================================

section(
  "7. DUE DATE LOGIC"
);


const dueServiceSource =
  fs.readFileSync(
    path.join(
      process.cwd(),
      "services/dueDateService.js"
    ),
    "utf8"
  );


if (
  dueServiceSource.includes(
    "48 * 60 * 60 * 1000"
  )
) {

  pass(
    "48-hour reminder window exists"
  );

} else {

  fail(
    "48-hour reminder window is missing"
  );

}


if (
  dueServiceSource.includes(
    "status: ACTIVE"
  ) &&
  dueServiceSource.includes(
    "status: OVERDUE"
  )
) {

  pass(
    "Overdue state detection exists"
  );

} else {

  fail(
    "Overdue state detection is missing"
  );

}


if (
  dueServiceSource.includes(
    "Notification.create"
  )
) {

  pass(
    "Due reminder notifications are persisted"
  );

} else {

  fail(
    "Notification persistence is missing"
  );

}


// ==================================================
// NOTIFICATION MODEL
// ==================================================

section(
  "8. NOTIFICATION MODEL"
);


const notificationSource =
  fs.readFileSync(
    path.join(
      process.cwd(),
      "models/Notification.js"
    ),
    "utf8"
  );


const notificationFields = [
  "user",
  "title",
  "message",
  "type",
  "read",
  "relatedTransaction"
];


for (
  const field
  of notificationFields
) {

  if (
    notificationSource.includes(
      field
    )
  ) {

    pass(
      `Notification model supports ${field}`
    );

  } else {

    fail(
      `Notification model missing ${field}`
    );

  }

}


// ==================================================
// COUNTDOWN
// ==================================================

section(
  "9. COUNTDOWN"
);


const countdownSource =
  fs.readFileSync(
    path.join(
      process.cwd(),
      "public/js/due-countdown.js"
    ),
    "utf8"
  );


if (
  countdownSource.includes(
    "setInterval"
  )
) {

  pass(
    "Countdown updates continuously"
  );

} else {

  fail(
    "Countdown interval is missing"
  );

}


if (
  countdownSource.includes(
    "due-countdown-warning"
  )
) {

  pass(
    "48-hour countdown warning state exists"
  );

} else {

  fail(
    "Countdown warning state is missing"
  );

}


// ==================================================
// EJS
// ==================================================

section(
  "10. EJS CHECK"
);


const ejsFiles = [
  "views/borrow/notifications.ejs"
];


for (
  const file
  of ejsFiles
) {

  try {

    const source =
      fs.readFileSync(
        path.join(
          process.cwd(),
          file
        ),
        "utf8"
      );


    ejs.compile(
      source,
      {
        filename:
          path.join(
            process.cwd(),
            file
          )
      }
    );


    pass(
      `${file} EJS syntax is valid`
    );

  } catch (error) {

    fail(
      `${file} EJS syntax error: ${error.message}`
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
    "✅ PHASE 4F STRUCTURE PASSED"
  );

  console.log(
    "Next test: Countdown → 48-hour reminder → overdue detection."
  );

  process.exit(0);

}


console.log("");

console.log(
  "❌ PHASE 4F STRUCTURE FAILED"
);

process.exit(1);
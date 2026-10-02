"use strict";

require("dotenv").config();

const fs =
  require("fs");

const path =
  require("path");

const mongoose =
  require("mongoose");

const connectDB =
  require("../config/db");

const Equipment =
  require("../models/Equipment");

const ChatbotLog =
  require("../models/ChatbotLog");

const {
  detectIntent,
  buildEquipmentQuery,
  askHardwareAssistant
} =
  require("../services/chatbotService");

let failures =
  0;

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

  failures += 1;

  console.error(
    `❌ ${message}`
  );
}

function section(
  title
) {

  console.log("");

  console.log(
    "=============================================="
  );

  console.log(title);

  console.log(
    "=============================================="
  );

  console.log("");
}

function requiredFile(
  relativePath
) {

  return fs.existsSync(
    path.join(
      __dirname,
      "..",
      relativePath
    )
  );
}

async function run() {

  section(
    "PHASE 6 AI HARDWARE ASSISTANT AUDIT"
  );

  try {

    // ==================================================
    // FILES
    // ==================================================

    const requiredFiles = [
      "models/ChatbotLog.js",
      "services/chatbotService.js",
      "controllers/chatbotController.js",
      "routes/chatbotRoutes.js",
      "views/chatbot/index.ejs",
      "public/css/chatbot.css",
      "public/js/chatbot.js"
    ];

    for (
      const file of requiredFiles
    ) {

      if (
        requiredFile(file)
      ) {

        pass(
          `File exists: ${file}`
        );

      } else {

        fail(
          `Missing required file: ${file}`
        );

      }
    }


    // ==================================================
    // MODELS
    // ==================================================

    if (
      ChatbotLog
    ) {

      pass(
        "ChatbotLog model loads."
      );

    } else {

      fail(
        "ChatbotLog model failed to load."
      );
    }


    const requiredChatbotFields = [
      "user",
      "question",
      "detectedIntent",
      "recommendedEquipment",
      "response"
    ];

    for (
      const field of requiredChatbotFields
    ) {

      if (
        ChatbotLog.schema.path(
          field
        )
      ) {

        pass(
          `ChatbotLog.${field} exists.`
        );

      } else {

        fail(
          `ChatbotLog.${field} is missing.`
        );

      }
    }


    // ==================================================
    // DATABASE
    // ==================================================

    await connectDB();

    pass(
      "MongoDB connection established."
    );


    const equipmentCount =
      await Equipment.countDocuments();

    pass(
      `Equipment collection contains ${equipmentCount} item(s).`
    );


    // ==================================================
    // INTENT TEST
    // ==================================================

    const weightIntent =
      detectIntent(
        "I need to measure weight"
      );

    if (
      weightIntent.name ===
      "WEIGHT_MEASUREMENT"
    ) {

      pass(
        "Weight measurement intent detected."
      );

    } else {

      fail(
        `Expected WEIGHT_MEASUREMENT, got ${weightIntent.name}.`
      );
    }


    const voltageIntent =
      detectIntent(
        "I need to measure voltage"
      );

    if (
      voltageIntent.name ===
      "VOLTAGE_MEASUREMENT"
    ) {

      pass(
        "Voltage measurement intent detected."
      );

    } else {

      fail(
        `Expected VOLTAGE_MEASUREMENT, got ${voltageIntent.name}.`
      );
    }


    const temperatureIntent =
      detectIntent(
        "I want a temperature monitoring project"
      );

    if (
      temperatureIntent.name ===
      "TEMPERATURE_MONITORING"
    ) {

      pass(
        "Temperature monitoring intent detected."
      );

    } else {

      fail(
        `Expected TEMPERATURE_MONITORING, got ${temperatureIntent.name}.`
      );
    }


    // ==================================================
    // QUERY GENERATION
    // ==================================================

    const query =
      buildEquipmentQuery(
        "I need to measure weight",
        weightIntent
      );

    if (
      query &&
      query.availableQuantity &&
      query.$or
    ) {

      pass(
        "AI assistant generates database availability query."
      );

    } else {

      fail(
        "AI assistant query generation is incomplete."
      );
    }


    // ==================================================
    // REAL DATABASE TEST
    // ==================================================

    const firstEquipment =
      await Equipment.findOne()
        .select(
          "name category"
        )
        .lean();


    if (
      firstEquipment &&
      firstEquipment.name
    ) {

      const queryText =
        `I need ${firstEquipment.name}`;

      const result =
        await askHardwareAssistant({
          message:
            queryText
        });

      if (
        result.success
      ) {

        pass(
          "Assistant successfully queried the real MongoDB inventory."
        );

      } else {

        fail(
          "Assistant did not return a successful result."
        );
      }

    } else {

      fail(
        "Cannot perform real database assistant test because equipment collection is empty."
      );
    }


    // ==================================================
    // LOG TEST
    // ==================================================

    const log =
      await ChatbotLog.findOne()
      .sort({
        createdAt: -1
      })
      .lean();

    if (
      log
    ) {

      pass(
        "Assistant interaction was logged in ChatbotLog."
      );

    } else {

      fail(
        "No ChatbotLog record was created."
      );
    }


    // ==================================================
    // SERVER ROUTE CHECK
    // ==================================================

    const serverSource =
      fs.readFileSync(
        path.join(
          __dirname,
          "..",
          "server.js"
        ),
        "utf8"
      );

    if (
      serverSource.includes(
        '"/chatbot"'
      ) &&
      serverSource.includes(
        "chatbotRoutes"
      )
    ) {

      pass(
        "AI assistant route is mounted in server.js."
      );

    } else {

      fail(
        "AI assistant route is not mounted in server.js."
      );
    }


    console.log("");

    if (
      failures === 0
    ) {

      console.log(
        "✅ PHASE 6 AI HARDWARE ASSISTANT AUDIT PASSED"
      );

      console.log(
        "AI Hardware Assistant is ready."
      );

    } else {

      console.error(
        `❌ PHASE 6 AI HARDWARE ASSISTANT AUDIT FAILED: ${failures} failure(s)`
      );

      process.exitCode =
        1;
    }

  } catch (
    error
  ) {

    console.error("");

    console.error(
      "❌ Phase 6 audit error:"
    );

    console.error(
      error.message
    );

    process.exitCode =
      1;

  } finally {

    await mongoose.disconnect();

    console.log(
      "MongoDB disconnected."
    );
  }
}

run();
require("dotenv").config();

const mongoose =
  require("mongoose");

const fs =
  require("fs");

const path =
  require("path");

const connectDB =
  require("../config/db");

const User =
  require("../models/User");

const {
  TRUST_SCORE_CONFIG,
  calculateTrustPoints,
  calculateNewTrustScore,
  clampTrustScore
} =
  require("../services/trustService");


let failures = 0;


function pass(message) {

  console.log(
    `✅ ${message}`
  );

}


function fail(message) {

  console.log(
    `❌ ${message}`
  );

  failures += 1;

}


function section(title) {

  console.log("");

  console.log(
    "=============================================="
  );

  console.log(
    title
  );

  console.log(
    "=============================================="
  );

}


function checkFile(
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

  await connectDB();

  try {

    section(
      "PHASE 5B TRUST SCORE AUDIT"
    );


    /* =====================================================
     * 1. FILE CHECK
     * ===================================================== */

    section(
      "1. FILE CHECK"
    );


    const requiredFiles = [

      "config/trust.js",

      "services/trustService.js",

      "models/User.js",

      "scripts/check-phase5b.js"

    ];


    for (
      const file of requiredFiles
    ) {

      if (
        checkFile(file)
      ) {

        pass(
          `File exists: ${file}`
        );

      } else {

        fail(
          `Missing file: ${file}`
        );

      }

    }


    /* =====================================================
     * 2. CONFIGURATION CHECK
     * ===================================================== */

    section(
      "2. TRUST CONFIGURATION"
    );


    const expectedConfig = {

      STARTING_SCORE:
        100,

      MIN_SCORE:
        0,

      MAX_SCORE:
        100,

      ON_TIME_RETURN_POINTS:
        2,

      LATE_RETURN_POINTS_PER_UNIT:
        -5,

      MINOR_DAMAGE_POINTS:
        -10,

      MAJOR_DAMAGE_POINTS:
        -25,

      SERIOUS_VIOLATION_POINTS:
        -50

    };


    let configValid =
      true;


    for (
      const [key, expected]
      of Object.entries(
        expectedConfig
      )
    ) {

      if (
        TRUST_SCORE_CONFIG[key] !==
        expected
      ) {

        fail(
          `Trust config ${key} expected ${expected}, received ${TRUST_SCORE_CONFIG[key]}.`
        );

        configValid =
          false;

      }

    }


    if (
      configValid
    ) {

      pass(
        "Trust score configuration matches the project rules."
      );

    }


    /* =====================================================
     * 3. CALCULATION TESTS
     * ===================================================== */

    section(
      "3. TRUST POINT CALCULATION"
    );


    const onTimePoints =
      calculateTrustPoints({
        onTimeReturn:
          true
      });


    if (
      onTimePoints ===
      2
    ) {

      pass(
        "On-time return gives +2."
      );

    } else {

      fail(
        `Expected +2 for on-time return, received ${onTimePoints}.`
      );

    }


    const latePoints =
      calculateTrustPoints({
        latePenaltyUnits:
          1
      });


    if (
      latePoints ===
      -5
    ) {

      pass(
        "One late penalty unit gives -5."
      );

    } else {

      fail(
        `Expected -5 for one late penalty unit, received ${latePoints}.`
      );

    }


    const minorDamagePoints =
      calculateTrustPoints({
        damageSeverity:
          "MINOR"
      });


    if (
      minorDamagePoints ===
      -10
    ) {

      pass(
        "Minor damage gives -10."
      );

    } else {

      fail(
        `Expected -10 for minor damage, received ${minorDamagePoints}.`
      );

    }


    const majorDamagePoints =
      calculateTrustPoints({
        damageSeverity:
          "MAJOR"
      });


    if (
      majorDamagePoints ===
      -25
    ) {

      pass(
        "Major damage gives -25."
      );

    } else {

      fail(
        `Expected -25 for major damage, received ${majorDamagePoints}.`
      );

    }


    const seriousViolationPoints =
      calculateTrustPoints({
        seriousViolation:
          true
      });


    if (
      seriousViolationPoints ===
      -50
    ) {

      pass(
        "Serious violation gives -50."
      );

    } else {

      fail(
        `Expected -50 for serious violation, received ${seriousViolationPoints}.`
      );

    }


    /* =====================================================
     * 4. SCORE BOUNDARY TEST
     * ===================================================== */

    section(
      "4. TRUST SCORE BOUNDARY"
    );


    const lowerResult =
      calculateNewTrustScore({
        currentScore:
          10,

        pointsChange:
          -50
      });


    if (
      lowerResult ===
      0
    ) {

      pass(
        "Trust score cannot go below 0."
      );

    } else {

      fail(
        `Lower trust boundary failed: ${lowerResult}.`
      );

    }


    const upperResult =
      calculateNewTrustScore({
        currentScore:
          99,

        pointsChange:
          10
      });


    if (
      upperResult ===
      100
    ) {

      pass(
        "Trust score cannot exceed 100."
      );

    } else {

      fail(
        `Upper trust boundary failed: ${upperResult}.`
      );

    }


    /* =====================================================
     * 5. USER DATA CHECK
     * ===================================================== */

    section(
      "5. USER TRUST SCORE DATA"
    );


    const users =
      await User.find({})
        .select(
          "_id name trustScore"
        )
        .lean();


    const invalidUsers =
      users.filter(
        user =>
          typeof user.trustScore !==
            "number" ||

          user.trustScore <
            TRUST_SCORE_CONFIG.MIN_SCORE ||

          user.trustScore >
            TRUST_SCORE_CONFIG.MAX_SCORE
      );


    if (
      invalidUsers.length ===
      0
    ) {

      pass(
        `All ${users.length} user(s) have trust scores between 0 and 100.`
      );

    } else {

      fail(
        `${invalidUsers.length} user(s) have invalid trust scores.`
      );

      console.log(
        invalidUsers
      );

    }


    /* =====================================================
     * 6. MODEL DEFAULT CHECK
     * ===================================================== */

    section(
      "6. USER MODEL DEFAULT"
    );


    const testUser =
      new User({

        name:
          "Trust Test User",

        email:
          "trust-test-unused@example.com",

        password:
          "temporary",

        role:
          "BORROWER",

        department:
          "Testing",

        year:
          1

      });


    if (
      testUser.trustScore ===
      TRUST_SCORE_CONFIG.STARTING_SCORE
    ) {

      pass(
        "New users default to trust score 100."
      );

    } else {

      fail(
        `Expected default trust score 100, received ${testUser.trustScore}.`
      );

    }


    /* =====================================================
     * 7. CLAMP FUNCTION
     * ===================================================== */

    section(
      "7. CLAMP FUNCTION"
    );


    if (
      clampTrustScore(
        -100
      ) === 0 &&

      clampTrustScore(
        500
      ) === 100 &&

      clampTrustScore(
        75
      ) === 75
    ) {

      pass(
        "Trust score clamp function works correctly."
      );

    } else {

      fail(
        "Trust score clamp function failed."
      );

    }


    /* =====================================================
     * FINAL RESULT
     * ===================================================== */

    section(
      "FINAL RESULT"
    );


    console.log(
      `Failures: ${failures}`
    );


    if (
      failures ===
      0
    ) {

      console.log("");

      console.log(
        "✅ PHASE 5B AUDIT PASSED"
      );

      console.log(
        "Trust score engine is ready."
      );

    } else {

      console.log("");

      console.log(
        "❌ PHASE 5B AUDIT FAILED"
      );

      process.exitCode =
        1;

    }

  } finally {

    await mongoose.connection.close();

  }

}


run()
  .catch(
    async error => {

      console.error("");

      console.error(
        "❌ PHASE 5B AUDIT ERROR"
      );

      console.error(
        error.message
      );


      try {

        await mongoose.connection.close();

      } catch (_) {}


      process.exit(1);

    }
  );
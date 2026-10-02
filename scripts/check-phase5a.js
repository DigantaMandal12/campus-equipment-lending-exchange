require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const connectDB =
  require("../config/db");

const Rating =
  require("../models/Rating");

const User =
  require("../models/User");

const Transaction =
  require("../models/Transaction");


let failures = 0;


/* =========================================================
 * AUDIT HELPERS
 * ========================================================= */

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


function checkFile(relativePath) {

  return fs.existsSync(
    path.join(
      __dirname,
      "..",
      relativePath
    )
  );

}


/* =========================================================
 * MAIN AUDIT
 * ========================================================= */

async function run() {

  await connectDB();

  try {

    section(
      "PHASE 5A RATING SYSTEM AUDIT"
    );


    /* =====================================================
     * 1. FILE CHECK
     * ===================================================== */

    section(
      "1. FILE CHECK"
    );


    const requiredFiles = [

      "models/Rating.js",

      "services/ratingService.js",

      "controllers/ratingController.js",

      "routes/ratingRoutes.js",

      "views/rating/form.ejs",

      "views/rating/my-ratings.ejs",

      "public/css/rating.css"

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
     * 2. MODEL LOADING
     * ===================================================== */

    section(
      "2. MODEL LOADING"
    );


    try {

      require(
        "../models/Rating"
      );

      pass(
        "Rating model loads."
      );

    } catch (error) {

      fail(
        `Rating model failed: ${error.message}`
      );

    }


    /* =====================================================
     * 3. SERVICE / CONTROLLER / ROUTE LOADING
     * ===================================================== */

    section(
      "3. SERVICE / CONTROLLER / ROUTE LOADING"
    );


    const modules = [

      "../services/ratingService",

      "../controllers/ratingController",

      "../routes/ratingRoutes"

    ];


    for (
      const modulePath of modules
    ) {

      try {

        require(
          modulePath
        );

        pass(
          `Module loads: ${modulePath}`
        );

      } catch (error) {

        fail(
          `${modulePath} failed: ${error.message}`
        );

      }

    }


    /* =====================================================
     * 4. RATING INDEXES
     * ===================================================== */

    section(
      "4. RATING INDEXES"
    );


    await Rating.init();


    const indexes =
      await Rating.collection.indexes();


    const uniqueRatingIndex =
      indexes.find(
        index =>
          index.unique === true &&
          index.key &&
          index.key.transaction === 1 &&
          index.key.giver === 1
      );


    if (
      uniqueRatingIndex
    ) {

      pass(
        "Unique transaction + giver rating index exists."
      );

    } else {

      fail(
        "Unique transaction + giver rating index is missing."
      );

    }


    /* =====================================================
     * 5. RATING FIELD VALIDATION
     * ===================================================== */

    section(
      "5. RATING FIELD VALIDATION"
    );


    const testRating =
      new Rating({

        equipmentConditionRating:
          6,

        punctualityRating:
          0,

        overallRating:
          8

      });


    let validationFailed =
      false;


    try {

      await testRating.validate();

    } catch (_) {

      validationFailed =
        true;

    }


    if (
      validationFailed
    ) {

      pass(
        "1–5 rating validation is working."
      );

    } else {

      fail(
        "Invalid rating values were not rejected."
      );

    }


    /* =====================================================
     * 6. USER TRUST SCORE FIELD
     * ===================================================== */

    section(
      "6. USER TRUST SCORE FIELD"
    );


    const users =
      await User.find({})
        .select(
          "_id trustScore"
        )
        .lean();


    const usersMissingTrustScore =
      users.filter(
        user =>
          typeof user.trustScore !==
          "number"
      );


    if (
      usersMissingTrustScore.length === 0
    ) {

      pass(
        `All ${users.length} user(s) have a numeric trustScore.`
      );

    } else {

      fail(
        `${usersMissingTrustScore.length} user(s) have no numeric trustScore.`
      );

    }


    /* =====================================================
     * 7. RATEABLE TRANSACTION STATUS CHECK
     * ===================================================== */

    section(
      "7. RATEABLE TRANSACTION STATUS CHECK"
    );


    const returnedTransactions =
      await Transaction.countDocuments({

        status: {
          $in: [
            "RETURNED",
            "COMPLETED"
          ]
        }

      });


    console.log(
      `Rateable transactions found: ${returnedTransactions}`
    );


    if (
      returnedTransactions > 0
    ) {

      pass(
        "Database contains at least one transaction that can be rated."
      );

    } else {

      console.log(
        "ℹ️ No RETURNED/COMPLETED transaction currently exists for live rating testing."
      );

    }


    /* =====================================================
     * 8. SERVER ROUTE CHECK
     * ===================================================== */

    section(
      "8. SERVER ROUTE CHECK"
    );


    const serverPath =
      path.join(
        __dirname,
        "..",
        "server.js"
      );


    if (
      fs.existsSync(
        serverPath
      )
    ) {

      const serverSource =
        fs.readFileSync(
          serverPath,
          "utf8"
        );


      /*
       * Windows files commonly use CRLF.
       * Normalize line endings first.
       */
      const normalizedServerSource =
        serverSource.replace(
          /\r\n/g,
          "\n"
        );


      /*
       * -----------------------------------------------
       * Check ratingRoutes import
       * -----------------------------------------------
       *
       * Supports:
       *
       * const ratingRoutes =
       *   require("./routes/ratingRoutes");
       *
       * and other whitespace variations.
       */
      const ratingRoutesImported =
        /require\s*\(\s*["']\.\/routes\/ratingRoutes["']\s*\)/s
          .test(
            normalizedServerSource
          );


      if (
        ratingRoutesImported
      ) {

        pass(
          "server.js imports ratingRoutes."
        );

      } else {

        fail(
          "server.js does not import ratingRoutes."
        );

      }


      /*
       * -----------------------------------------------
       * Check /rating route mount
       * -----------------------------------------------
       *
       * Supports:
       *
       * app.use(
       *   "/rating",
       *   ratingRoutes
       * );
       *
       * and:
       *
       * app.use("/rating", ratingRoutes);
       */
      const ratingRouteMounted =
        /app\.use\s*\(\s*["']\/rating["']\s*,\s*ratingRoutes\s*\)/s
          .test(
            normalizedServerSource
          );


      if (
        ratingRouteMounted
      ) {

        pass(
          "server.js mounts /rating."
        );

      } else {

        fail(
          "server.js does not mount /rating."
        );

      }

    } else {

      fail(
        "server.js was not found."
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
      failures === 0
    ) {

      console.log("");

      console.log(
        "✅ PHASE 5A AUDIT PASSED"
      );

      console.log(
        "Rating system foundation is ready."
      );

    } else {

      console.log("");

      console.log(
        "❌ PHASE 5A AUDIT FAILED"
      );

      process.exitCode = 1;

    }

  } finally {

    await mongoose.connection.close();

  }

}


/* =========================================================
 * ERROR HANDLER
 * ========================================================= */

run()
  .catch(
    async error => {

      console.error("");

      console.error(
        "❌ PHASE 5A AUDIT ERROR"
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
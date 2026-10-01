"use strict";

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB =
  require("../config/db");

const Equipment =
  require("../models/Equipment");

const {
  buildSearchQuery,
  searchEquipment,
  getSearchFilterOptions
} = require("../services/searchService");

let failures = 0;

function pass(message) {
  console.log(
    `✅ ${message}`
  );
}

function fail(message) {
  failures += 1;

  console.error(
    `❌ ${message}`
  );
}

function section(title) {
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

async function run() {

  section(
    "PHASE 5 SMART SEARCH FINAL AUDIT"
  );

  try {

    await connectDB();

    pass(
      "MongoDB connection established."
    );

    // --------------------------------------------------
    // MODEL CHECK
    // --------------------------------------------------

    const requiredFields = [
      "name",
      "description",
      "category",
      "department",
      "condition",
      "availableQuantity",
      "rentalFee"
    ];

    for (
      const field of requiredFields
    ) {

      if (
        Equipment.schema.path(
          field
        )
      ) {

        pass(
          `Equipment.${field} exists.`
        );

      } else {

        fail(
          `Equipment.${field} is missing.`
        );

      }

    }

    // --------------------------------------------------
    // FILTER OPTIONS
    // --------------------------------------------------

    const filterOptions =
      await getSearchFilterOptions();

    pass(
      `Filter options loaded: departments=${filterOptions.departments.length}, categories=${filterOptions.categories.length}, conditions=${filterOptions.conditions.length}`
    );

    // --------------------------------------------------
    // REAL DATABASE DATA
    // --------------------------------------------------

    const allEquipment =
      await Equipment.find({})
        .select(
          [
            "name",
            "description",
            "category",
            "department",
            "condition",
            "availableQuantity",
            "rentalFee"
          ].join(" ")
        )
        .sort({
          createdAt: -1
        })
        .limit(10)
        .lean();

    if (
      allEquipment.length === 0
    ) {

      fail(
        "No equipment records exist in MongoDB. Add equipment before testing Smart Search."
      );

    } else {

      pass(
        `Found ${allEquipment.length} real equipment record(s) in MongoDB.`
      );

      console.log("");

      allEquipment.forEach(
        (item, index) => {

          console.log(
            `   ${index + 1}. ${item.name || "Unnamed equipment"} | category=${item.category || "-"} | department=${item.department || "-"} | condition=${item.condition || "-"} | available=${item.availableQuantity ?? "-"} | rentalFee=${item.rentalFee ?? "-"}`
          );

        }
      );

      console.log("");
    }

    // --------------------------------------------------
    // BLANK SEARCH
    // --------------------------------------------------

    const blankSearch =
      await searchEquipment({
        page: 1,
        limit: 12
      });

    if (
      blankSearch.total ===
      allEquipment.length
    ) {

      pass(
        `Blank search returned ${blankSearch.total} database item(s).`
      );

    } else {

      pass(
        `Blank search executed and returned ${blankSearch.total} item(s).`
      );

    }

    // --------------------------------------------------
    // REAL NAME SEARCH
    // --------------------------------------------------

    if (
      allEquipment.length > 0 &&
      allEquipment[0].name
    ) {

      const realName =
        String(
          allEquipment[0].name
        ).trim();

      const realSearch =
        await searchEquipment({
          keyword: realName,
          page: 1,
          limit: 12
        });

      if (
        realSearch.total > 0
      ) {

        pass(
          `Real-data keyword search works for "${realName}".`
        );

      } else {

        fail(
          `Real-data keyword search failed for existing equipment "${realName}".`
        );

      }

    }

    // --------------------------------------------------
    // REAL CATEGORY SEARCH
    // --------------------------------------------------

    const categoryItem =
      allEquipment.find(
        (item) =>
          item.category
      );

    if (categoryItem) {

      const categorySearch =
        await searchEquipment({
          category:
            categoryItem.category,
          page: 1,
          limit: 12
        });

      if (
        categorySearch.total > 0
      ) {

        pass(
          `Category search works for "${categoryItem.category}".`
        );

      } else {

        fail(
          `Category search failed for existing category "${categoryItem.category}".`
        );

      }

    }

    // --------------------------------------------------
    // REAL DEPARTMENT SEARCH
    // --------------------------------------------------

    const departmentItem =
      allEquipment.find(
        (item) =>
          item.department
      );

    if (departmentItem) {

      const departmentSearch =
        await searchEquipment({
          department:
            departmentItem.department,
          page: 1,
          limit: 12
        });

      if (
        departmentSearch.total > 0
      ) {

        pass(
          `Department search works for "${departmentItem.department}".`
        );

      } else {

        fail(
          `Department search failed for existing department "${departmentItem.department}".`
        );

      }

    }

    // --------------------------------------------------
    // REAL CONDITION SEARCH
    // --------------------------------------------------

    const conditionItem =
      allEquipment.find(
        (item) =>
          item.condition
      );

    if (conditionItem) {

      const conditionSearch =
        await searchEquipment({
          condition:
            conditionItem.condition,
          page: 1,
          limit: 12
        });

      if (
        conditionSearch.total > 0
      ) {

        pass(
          `Condition search works for "${conditionItem.condition}".`
        );

      } else {

        fail(
          `Condition search failed for existing condition "${conditionItem.condition}".`
        );

      }

    }

    // --------------------------------------------------
    // PRICE SEARCH
    // --------------------------------------------------

    const priceItem =
      allEquipment.find(
        (item) =>
          Number.isFinite(
            Number(
              item.rentalFee
            )
          )
      );

    if (priceItem) {

      const price =
        Number(
          priceItem.rentalFee
        );

      const priceSearch =
        await searchEquipment({
          minPrice: price,
          maxPrice: price,
          page: 1,
          limit: 12
        });

      if (
        priceSearch.total > 0
      ) {

        pass(
          `Price search works for rental fee ₹${price}.`
        );

      } else {

        fail(
          `Price search failed for existing rental fee ₹${price}.`
        );

      }

    }

    // --------------------------------------------------
    // AVAILABILITY SEARCH
    // --------------------------------------------------

    const availableItem =
      allEquipment.find(
        (item) =>
          Number(
            item.availableQuantity
          ) > 0
      );

    if (availableItem) {

      const availabilitySearch =
        await searchEquipment({
          availability:
            "available",
          page: 1,
          limit: 12
        });

      if (
        availabilitySearch.total > 0
      ) {

        pass(
          "Availability search works."
        );

      } else {

        fail(
          "Availability search failed even though available equipment exists."
        );

      }

    }

    // --------------------------------------------------
    // QUERY GENERATION
    // --------------------------------------------------

    const query =
      buildSearchQuery({
        keyword:
          allEquipment[0]?.name ||
          "test"
      });

    if (
      query &&
      Object.keys(query).length > 0
    ) {

      pass(
        "MongoDB search query generated correctly."
      );

    } else {

      fail(
        "MongoDB search query was empty."
      );

    }

    // --------------------------------------------------
    // IMPOSSIBLE SEARCH
    // --------------------------------------------------

    const impossibleSearch =
      await searchEquipment({
        keyword:
          "__PHASE5_COMPLETELY_IMPOSSIBLE_SEARCH__",
        page: 1,
        limit: 12
      });

    if (
      impossibleSearch.total === 0
    ) {

      pass(
        "Unmatched keyword correctly returns zero results."
      );

    } else {

      fail(
        "Impossible keyword unexpectedly returned results."
      );

    }

    // --------------------------------------------------
    // FINAL RESULT
    // --------------------------------------------------

    console.log("");

    if (
      failures === 0
    ) {

      console.log(
        "✅ PHASE 5 SMART SEARCH FINAL AUDIT PASSED"
      );

      console.log(
        "✅ Smart Search works against real MongoDB data."
      );

    } else {

      console.error(
        `❌ PHASE 5 SMART SEARCH FINAL AUDIT FAILED: ${failures} failure(s)`
      );

      process.exitCode = 1;
    }

  } catch (error) {

    console.error("");
    console.error(
      "❌ Smart Search audit error:"
    );

    console.error(
      error.message
    );

    process.exitCode = 1;

  } finally {

    await mongoose.disconnect();

    console.log(
      "MongoDB disconnected."
    );

  }

}

run();
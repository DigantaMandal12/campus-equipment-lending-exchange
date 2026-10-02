"use strict";

const connectDB = require("../config/db");
const Equipment = require("../models/Equipment");

function escapeRegex(value) {
  return String(value || "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function cleanString(value) {
  return String(value || "").trim();
}

function buildCaseInsensitiveExactRegex(value) {
  const clean = cleanString(value);

  if (!clean) {
    return null;
  }

  return new RegExp(
    `^${escapeRegex(clean)}$`,
    "i"
  );
}

function buildKeywordQuery(keyword) {
  const cleanKeyword = cleanString(keyword);

  if (!cleanKeyword) {
    return null;
  }

  /*
   * Search the actual MongoDB document fields.
   *
   * Keyword fields:
   * - name
   * - description
   * - category
   * - department
   * - borrowingTerms
   *
   * Multiple words are treated as AND conditions so:
   *
   * "arduino uno"
   *
   * can match a document containing both words.
   */

  const tokens = cleanKeyword
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);

  const textFields = [
    "name",
    "description",
    "category",
    "department",
    "borrowingTerms"
  ];

  const tokenConditions = tokens.map(
    (token) => {

      const regex = new RegExp(
        escapeRegex(token),
        "i"
      );

      return {
        $or: textFields.map(
          (field) => ({
            [field]: regex
          })
        )
      };
    }
  );

  return {
    $and: tokenConditions
  };
}

function addNumericPriceFilter(
  query,
  minPrice,
  maxPrice
) {
  const minText = cleanString(minPrice);
  const maxText = cleanString(maxPrice);

  const hasMin =
    minText !== "" &&
    Number.isFinite(Number(minText));

  const hasMax =
    maxText !== "" &&
    Number.isFinite(Number(maxText));

  if (!hasMin && !hasMax) {
    return;
  }

  const min = hasMin
    ? Math.max(0, Number(minText))
    : undefined;

  const max = hasMax
    ? Math.max(0, Number(maxText))
    : undefined;

  /*
   * If the user accidentally enters:
   * min = 1000
   * max = 500
   *
   * automatically normalize it instead of
   * returning a confusing zero-result page.
   */
  if (
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    min > max
  ) {
    query.rentalFee = {
      $gte: max,
      $lte: min
    };

    return;
  }

  if (Number.isFinite(min)) {
    query.rentalFee = {
      ...(query.rentalFee || {}),
      $gte: min
    };
  }

  if (Number.isFinite(max)) {
    query.rentalFee = {
      ...(query.rentalFee || {}),
      $lte: max
    };
  }
}

function buildSearchQuery(filters = {}) {

  const keyword =
    cleanString(filters.keyword);

  const department =
    cleanString(filters.department);

  const category =
    cleanString(filters.category);

  const condition =
    cleanString(filters.condition);

  const availability =
    cleanString(filters.availability)
      .toLowerCase();

  const query = {};

  // --------------------------------------------------
  // KEYWORD
  // --------------------------------------------------

  const keywordQuery =
    buildKeywordQuery(keyword);

  if (keywordQuery) {
    query.$and = [
      keywordQuery
    ];
  }

  // --------------------------------------------------
  // DEPARTMENT
  // --------------------------------------------------

  const departmentRegex =
    buildCaseInsensitiveExactRegex(
      department
    );

  if (departmentRegex) {
    query.department =
      departmentRegex;
  }

  // --------------------------------------------------
  // CATEGORY
  // --------------------------------------------------

  const categoryRegex =
    buildCaseInsensitiveExactRegex(
      category
    );

  if (categoryRegex) {
    query.category =
      categoryRegex;
  }

  // --------------------------------------------------
  // CONDITION
  // --------------------------------------------------

  const conditionRegex =
    buildCaseInsensitiveExactRegex(
      condition
    );

  if (conditionRegex) {
    query.condition =
      conditionRegex;
  }

  // --------------------------------------------------
  // AVAILABILITY
  // --------------------------------------------------

  if (availability === "available") {

    query.availableQuantity = {
      $gt: 0
    };

    query.status = {
      $in: [
        "AVAILABLE",
        "ACTIVE",
        "AVAILABLE"
      ]
    };

  } else if (
    availability === "unavailable"
  ) {

    query.$or = [
      {
        availableQuantity: {
          $lte: 0
        }
      },
      {
        status: {
          $in: [
            "UNAVAILABLE",
            "INACTIVE"
          ]
        }
      }
    ];
  }

  // --------------------------------------------------
  // PRICE
  // --------------------------------------------------

  addNumericPriceFilter(
    query,
    filters.minPrice,
    filters.maxPrice
  );

  return query;
}

async function searchEquipment(
  filters = {}
) {

  await connectDB();

  const page =
    Math.max(
      1,
      Number(filters.page) || 1
    );

  const requestedLimit =
    Number(filters.limit) || 12;

  const limit =
    Math.min(
      24,
      Math.max(
        1,
        requestedLimit
      )
    );

  const skip =
    (page - 1) * limit;

  const query =
    buildSearchQuery(filters);

  const [
    equipment,
    total
  ] = await Promise.all([

    Equipment.find(query)
      .select(
        [
          "name",
          "description",
          "category",
          "department",
          "condition",
          "images",
          "quantity",
          "availableQuantity",
          "rentalFee",
          "securityDeposit",
          "borrowingTerms",
          "status",
          "owner",
          "createdAt",
          "updatedAt"
        ].join(" ")
      )
      .sort({
        availableQuantity: -1,
        createdAt: -1
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    Equipment.countDocuments(
      query
    )

  ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total / limit
      )
    );

  return {
    equipment,
    total,
    page,
    limit,
    totalPages,
    hasPreviousPage:
      page > 1,
    hasNextPage:
      page < totalPages,
    query
  };
}

async function getSearchFilterOptions() {

  await connectDB();

  const [
    departments,
    categories,
    conditions
  ] = await Promise.all([

    Equipment.distinct(
      "department"
    ),

    Equipment.distinct(
      "category"
    ),

    Equipment.distinct(
      "condition"
    )

  ]);

  return {
    departments:
      departments
        .filter(
          (value) =>
            cleanString(value) !== ""
        )
        .map(
          (value) =>
            cleanString(value)
        )
        .sort(
          (a, b) =>
            a.localeCompare(
              b
            )
        ),

    categories:
      categories
        .filter(
          (value) =>
            cleanString(value) !== ""
        )
        .map(
          (value) =>
            cleanString(value)
        )
        .sort(
          (a, b) =>
            a.localeCompare(
              b
            )
        ),

    conditions:
      conditions
        .filter(
          (value) =>
            cleanString(value) !== ""
        )
        .map(
          (value) =>
            cleanString(value)
        )
        .sort(
          (a, b) =>
            a.localeCompare(
              b
            )
        )
  };
}

module.exports = {
  buildSearchQuery,
  searchEquipment,
  getSearchFilterOptions
};
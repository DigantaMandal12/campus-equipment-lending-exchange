"use strict";

const {
  searchEquipment,
  getSearchFilterOptions
} = require("../services/searchService");

async function index(req, res, next) {
  try {
    const filters = {
      keyword: req.query.keyword,
      department: req.query.department,
      category: req.query.category,
      availability: req.query.availability,
      condition: req.query.condition,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      page: req.query.page,
      limit: req.query.limit || 12
    };

    const [
      searchResult,
      filterOptions
    ] = await Promise.all([
      searchEquipment(filters),
      getSearchFilterOptions()
    ]);

    res.render(
      "search/index",
      {
        title: "Smart Search",
        filters,
        ...searchResult,
        ...filterOptions
      }
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  index
};
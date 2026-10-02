"use strict";

const express =
  require("express");

const chatbotController =
  require("../controllers/chatbotController");

const router =
  express.Router();

router.get(
  "/",
  chatbotController.page
);

router.post(
  "/ask",
  chatbotController.ask
);

module.exports =
  router;
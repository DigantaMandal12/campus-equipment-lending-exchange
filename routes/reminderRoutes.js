const express = require("express");

const {
  runReminderJob
} = require(
  "../controllers/reminderController"
);

const router =
  express.Router();


router.get(
  "/due",
  runReminderJob
);


module.exports = router;
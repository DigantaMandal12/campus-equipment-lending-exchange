const express = require("express");

const {
  renderNotifications,
  markRead,
  markAllRead
} = require(
  "../controllers/notificationController"
);

const {
  requireAuth
} = require(
  "../middleware/authMiddleware"
);

const router =
  express.Router();


router.use(
  requireAuth
);


router.get(
  "/",
  renderNotifications
);


router.post(
  "/read-all",
  markAllRead
);


router.post(
  "/:id/read",
  markRead
);


module.exports = router;
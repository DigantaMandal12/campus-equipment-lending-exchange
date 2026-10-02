const express =
  require("express");

const {
  requireAuth
} = require(
  "../middleware/authMiddleware"
);

const {
  showRatingForm,
  submitRating,
  mySubmittedRatings,
  myReceivedRatings
} = require(
  "../controllers/ratingController"
);


const router =
  express.Router();


/*
 * Submitted ratings.
 */
router.get(
  "/my/submitted",
  requireAuth,
  mySubmittedRatings
);


/*
 * Ratings received by the logged-in user.
 */
router.get(
  "/my/received",
  requireAuth,
  myReceivedRatings
);


/*
 * Rating form.
 */
router.get(
  "/transaction/:transactionId",
  requireAuth,
  showRatingForm
);


/*
 * Submit rating.
 */
router.post(
  "/transaction/:transactionId",
  requireAuth,
  submitRating
);


module.exports =
  router;
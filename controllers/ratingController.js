const {
  getRatingContext,
  createRating,
  getRatingsByGiver,
  getRatingsByReceiver
} = require("../services/ratingService");


function getSessionUserId(req) {

  return (
    req.session?.user?._id ||
    req.session?.user?.id ||
    req.session?.user?.userId ||
    null
  );

}


/*
 * GET /rating/transaction/:transactionId
 *
 * Show the rating form.
 */
async function showRatingForm(
  req,
  res
) {

  try {

    const userId =
      getSessionUserId(req);

    if (!userId) {

      return res.redirect(
        "/auth/login?error=Please+login+to+continue"
      );

    }


    const context =
      await getRatingContext(
        req.params.transactionId,
        userId
      );


    return res.render(
      "rating/form",
      {
        title:
          "Rate Transaction",

        transaction:
          context.transaction,

        viewerRole:
          context.viewerRole,

        receiver:
          context.receiver,

        existingRating:
          context.existingRating,

        success:
          req.query.success || "",

        error:
          req.query.error || ""
      }
    );

  } catch (error) {

    console.error(
      "Show rating form error:",
      error.message
    );


    return res.status(
      error.statusCode || 500
    ).render(
      "rating/form",
      {
        title:
          "Rate Transaction",

        transaction:
          null,

        viewerRole:
          null,

        receiver:
          null,

        existingRating:
          null,

        success:
          "",

        error:
          error.message ||
          "Unable to load rating form."
      }
    );

  }

}


/*
 * POST /rating/transaction/:transactionId
 *
 * Save a rating.
 */
async function submitRating(
  req,
  res
) {

  const userId =
    getSessionUserId(req);


  if (!userId) {

    return res.redirect(
      "/auth/login?error=Please+login+to+continue"
    );

  }


  try {

    await createRating({
      transactionId:
        req.params.transactionId,

      giverId:
        userId,

      equipmentConditionRating:
        req.body.equipmentConditionRating,

      punctualityRating:
        req.body.punctualityRating,

      overallRating:
        req.body.overallRating,

      comment:
        req.body.comment
    });


    return res.redirect(
      `/rating/transaction/${encodeURIComponent(
        req.params.transactionId
      )}?success=Rating+submitted+successfully`
    );

  } catch (error) {

    console.error(
      "Submit rating error:",
      error.message
    );


    return res.redirect(
      `/rating/transaction/${encodeURIComponent(
        req.params.transactionId
      )}?error=${encodeURIComponent(
        error.message ||
        "Unable to submit rating."
      )}`
    );

  }

}


/*
 * GET /rating/my/submitted
 */
async function mySubmittedRatings(
  req,
  res
) {

  const userId =
    getSessionUserId(req);


  if (!userId) {

    return res.redirect(
      "/auth/login?error=Please+login+to+continue"
    );

  }


  try {

    const ratings =
      await getRatingsByGiver(
        userId
      );


    return res.render(
      "rating/my-ratings",
      {
        title:
          "My Submitted Ratings",

        ratings,

        mode:
          "submitted",

        success:
          "",

        error:
          ""
      }
    );

  } catch (error) {

    console.error(
      "Submitted ratings error:",
      error.message
    );


    return res.status(
      error.statusCode || 500
    ).render(
      "rating/my-ratings",
      {
        title:
          "My Submitted Ratings",

        ratings:
          [],

        mode:
          "submitted",

        success:
          "",

        error:
          error.message ||
          "Unable to load ratings."
      }
    );

  }

}


/*
 * GET /rating/my/received
 */
async function myReceivedRatings(
  req,
  res
) {

  const userId =
    getSessionUserId(req);


  if (!userId) {

    return res.redirect(
      "/auth/login?error=Please+login+to+continue"
    );

  }


  try {

    const ratings =
      await getRatingsByReceiver(
        userId
      );


    return res.render(
      "rating/my-ratings",
      {
        title:
          "Ratings Received",

        ratings,

        mode:
          "received",

        success:
          "",

        error:
          ""
      }
    );

  } catch (error) {

    console.error(
      "Received ratings error:",
      error.message
    );


    return res.status(
      error.statusCode || 500
    ).render(
      "rating/my-ratings",
      {
        title:
          "Ratings Received",

        ratings:
          [],

        mode:
          "received",

        success:
          "",

        error:
          error.message ||
          "Unable to load ratings."
      }
    );

  }

}


module.exports = {
  showRatingForm,
  submitRating,
  mySubmittedRatings,
  myReceivedRatings
};
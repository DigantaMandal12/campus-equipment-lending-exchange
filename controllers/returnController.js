const {
  getReturnDetails,
  requestReturn,
  confirmReturn,
  markDepositRefunded,
  getLenderReturnQueue
} = require("../services/returnService");


/*
 * ==================================================
 * GET AUTHENTICATED USER ID
 * ==================================================
 *
 * The existing authentication middleware exposes the
 * current user to the application, but different parts
 * of the application may keep the ID in different places.
 *
 * We safely check the common locations without changing
 * the authentication system itself.
 */
function getCurrentUserId(req, res) {

  const candidates = [

    // Direct request user objects
    req.currentUser,
    req.user,

    // Express locals
    res.locals
      ? res.locals.currentUser
      : null,

    // Session-based values
    req.session
      ? req.session.userId
      : null,

    req.session
      ? req.session.userID
      : null,

    req.session
      ? req.session.user_id
      : null,

    req.session
      ? req.session.user
      : null

  ];


  for (
    const candidate of candidates
  ) {

    if (!candidate) {
      continue;
    }


    /*
     * Direct ObjectId/string
     */
    if (
      typeof candidate === "string" &&
      candidate.trim() !== ""
    ) {

      return candidate;

    }


    /*
     * Mongoose/Object user
     */
    if (
      candidate._id
    ) {

      return candidate._id;

    }


    /*
     * Generic ID property
     */
    if (
      candidate.id
    ) {

      return candidate.id;

    }

  }


  throw new Error(
    "Authenticated user ID is unavailable."
  );
}


/*
 * ==================================================
 * BORROWER
 * RENDER RETURN PAGE
 * ==================================================
 */
async function renderReturn(
  req,
  res,
  next
) {

  try {

    const borrowerId =
      getCurrentUserId(
        req,
        res
      );


    const transaction =
      await getReturnDetails(
        borrowerId,
        req.params.transactionId
      );


    res.render(
      "borrow/return",
      {
        title:
          "Return Equipment",

        transaction,

        success:
          req.query.success || "",

        error:
          req.query.error || ""
      }
    );

  } catch (error) {

    next(error);

  }
}


/*
 * ==================================================
 * BORROWER
 * REQUEST RETURN
 * ==================================================
 */
async function requestReturnController(
  req,
  res
) {

  try {

    const borrowerId =
      getCurrentUserId(
        req,
        res
      );


    await requestReturn(
      borrowerId,
      req.params.transactionId
    );


    res.redirect(
      "/borrow/my-requests?success=" +
      encodeURIComponent(
        "Return request submitted. Waiting for lender confirmation."
      )
    );

  } catch (error) {

    const message =
      error.message ||
      "Unable to submit return request.";


    res.redirect(
      "/borrow/my-requests?error=" +
      encodeURIComponent(
        message
      )
    );

  }
}


/*
 * ==================================================
 * LENDER
 * RENDER RETURN MANAGEMENT
 * ==================================================
 */
async function renderLenderReturns(
  req,
  res,
  next
) {

  try {

    const lenderId =
      getCurrentUserId(
        req,
        res
      );


    const transactions =
      await getLenderReturnQueue(
        lenderId
      );


    res.render(
      "lender/returns",
      {
        title:
          "Return Management",

        transactions,

        success:
          req.query.success || "",

        error:
          req.query.error || ""
      }
    );

  } catch (error) {

    next(error);

  }
}


/*
 * ==================================================
 * LENDER
 * CONFIRM RETURN
 * ==================================================
 */
async function confirmReturnController(
  req,
  res
) {

  try {

    const lenderId =
      getCurrentUserId(
        req,
        res
      );


    const returnedCondition =
      req.body.returnedCondition;


    await confirmReturn(
      lenderId,
      req.params.transactionId,
      returnedCondition
    );


    res.redirect(
      "/return/lender?success=" +
      encodeURIComponent(
        "Equipment return confirmed. Inventory restored and refund marked pending."
      )
    );

  } catch (error) {

    res.redirect(
      "/return/lender?error=" +
      encodeURIComponent(
        error.message ||
        "Unable to confirm return."
      )
    );

  }
}


/*
 * ==================================================
 * LENDER
 * MARK DEPOSIT REFUNDED
 * ==================================================
 */
async function markDepositRefundedController(
  req,
  res
) {

  try {

    const lenderId =
      getCurrentUserId(
        req,
        res
      );


    await markDepositRefunded(
      lenderId,
      req.params.transactionId
    );


    res.redirect(
      "/return/lender?success=" +
      encodeURIComponent(
        "Security deposit marked as refunded."
      )
    );

  } catch (error) {

    res.redirect(
      "/return/lender?error=" +
      encodeURIComponent(
        error.message ||
        "Unable to mark deposit as refunded."
      )
    );

  }
}


/*
 * ==================================================
 * EXPORTS
 * ==================================================
 */
module.exports = {

  renderReturn,

  requestReturn:
    requestReturnController,

  renderLenderReturns,

  confirmReturn:
    confirmReturnController,

  markDepositRefunded:
    markDepositRefundedController

};
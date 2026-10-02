const {
  getIncomingBorrowRequests,
  approveBorrowRequest,
  rejectBorrowRequest
} = require("../services/lenderService");

const {
  getPendingPaymentVerifications,
  verifyPayment: verifyPaymentService,
  rejectPayment: rejectPaymentService
} = require("../services/paymentService");

function buildRedirect(
  path,
  key,
  message
) {
  return `${path}?${key}=${encodeURIComponent(
    message
  )}`;
}

async function requests(
  req,
  res,
  next
) {
  try {
    const incomingRequests =
      await getIncomingBorrowRequests(
        req.session.user.id
      );

    return res.render(
      "lender/requests",
      {
        title: "Borrow Requests",
        requests: incomingRequests,
        success:
          req.query.success || null,
        error:
          req.query.error || null
      }
    );
  } catch (error) {
    next(error);
  }
}

async function approve(
  req,
  res,
  next
) {
  try {
    await approveBorrowRequest(
      req.session.user.id,
      req.params.transactionId
    );

    return res.redirect(
      buildRedirect(
        "/lender/requests",
        "success",
        "Borrow request approved successfully."
      )
    );
  } catch (error) {
    const statusCode =
      error.statusCode || 400;

    if (statusCode < 500) {
      return res.redirect(
        buildRedirect(
          "/lender/requests",
          "error",
          error.message
        )
      );
    }

    next(error);
  }
}

async function reject(
  req,
  res,
  next
) {
  try {
    await rejectBorrowRequest(
      req.session.user.id,
      req.params.transactionId,
      req.body.rejectionReason
    );

    return res.redirect(
      buildRedirect(
        "/lender/requests",
        "success",
        "Borrow request rejected successfully."
      )
    );
  } catch (error) {
    const statusCode =
      error.statusCode || 400;

    if (statusCode < 500) {
      return res.redirect(
        buildRedirect(
          "/lender/requests",
          "error",
          error.message
        )
      );
    }

    next(error);
  }
}

async function verifyPayment(
  req,
  res,
  next
) {
  try {
    await verifyPaymentService(
      req.session.user.id,
      req.params.transactionId
    );

    return res.redirect(
      buildRedirect(
        "/lender/requests",
        "success",
        "Security deposit verified successfully."
      )
    );
  } catch (error) {
    const statusCode =
      error.statusCode || 400;

    if (statusCode < 500) {
      return res.redirect(
        buildRedirect(
          "/lender/requests",
          "error",
          error.message
        )
      );
    }

    next(error);
  }
}

async function rejectPayment(
  req,
  res,
  next
) {
  try {
    await rejectPaymentService(
      req.session.user.id,
      req.params.transactionId
    );

    return res.redirect(
      buildRedirect(
        "/lender/requests",
        "success",
        "Payment reference rejected. Borrower can submit another reference."
      )
    );
  } catch (error) {
    const statusCode =
      error.statusCode || 400;

    if (statusCode < 500) {
      return res.redirect(
        buildRedirect(
          "/lender/requests",
          "error",
          error.message
        )
      );
    }

    next(error);
  }
}

module.exports = {
  requests,
  approve,
  reject,
  verifyPayment,
  rejectPayment,
  getPendingPaymentVerifications
};
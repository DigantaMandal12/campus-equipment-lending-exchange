const {
  getCheckoutDetails,
  checkoutBorrowRequest
} = require("../services/checkoutService");

async function renderCheckout(
  req,
  res,
  next
) {
  try {
    const transaction =
      await getCheckoutDetails(
        req.session.user.id,
        req.params.transactionId
      );

    return res.render(
      "borrow/checkout",
      {
        title: "Checkout Equipment",
        transaction,
        success: null,
        error: null
      }
    );
  } catch (error) {
    next(error);
  }
}

async function checkout(
  req,
  res,
  next
) {
  try {
    const transaction =
      await checkoutBorrowRequest(
        req.session.user.id,
        req.params.transactionId
      );

    return res.redirect(
      `/borrow/my-requests?success=${encodeURIComponent(
        `Checkout completed for ${transaction.equipment.name}.`
      )}`
    );
  } catch (error) {
    try {
      const transaction =
        await getCheckoutDetails(
          req.session.user.id,
          req.params.transactionId
        );

      const statusCode =
        error.statusCode || 400;

      return res
        .status(statusCode)
        .render(
          "borrow/checkout",
          {
            title: "Checkout Equipment",
            transaction,
            success: null,
            error: error.message
          }
        );
    } catch (renderError) {
      next(renderError);
    }
  }
}

module.exports = {
  renderCheckout,
  checkout
};
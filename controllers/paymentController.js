const QRCode = require("qrcode");

const {
  buildUpiUri,
  getPaymentDetails,
  submitPaymentReference
} = require("../services/paymentService");

async function renderPayment(
  req,
  res,
  next
) {
  try {
    const transaction =
      await getPaymentDetails(
        req.session.user.id,
        req.params.transactionId
      );

    if (!process.env.UPI_ID) {
      const error = new Error(
        "UPI payment configuration is missing. Add UPI_ID to your .env file."
      );

      error.statusCode = 500;

      throw error;
    }

    let upiUri = null;
    let qrCodeDataUrl = null;

    if (
      transaction.status ===
        "APPROVED" &&
      transaction.paymentStatus !==
        "DEPOSIT_CONFIRMED"
    ) {
      upiUri = buildUpiUri({
        upiId: process.env.UPI_ID,
        payeeName:
          process.env.UPI_PAYEE_NAME ||
          "Campus Exchange",
        amount:
          transaction.securityDeposit,
        transactionId:
          transaction._id.toString(),
        equipmentName:
          transaction.equipment?.name ||
          "Equipment"
      });

      qrCodeDataUrl =
        await QRCode.toDataURL(
          upiUri,
          {
            width: 300,
            margin: 2,
            errorCorrectionLevel: "M"
          }
        );
    }

    return res.render(
      "borrow/payment",
      {
        title: "Security Deposit Payment",
        transaction,
        upiUri,
        qrCodeDataUrl,
        error: null
      }
    );
  } catch (error) {
    next(error);
  }
}

async function submitPayment(
  req,
  res,
  next
) {
  try {
    await submitPaymentReference(
      req.session.user.id,
      req.params.transactionId,
      req.body
    );

    return res.redirect(
      `/borrow/my-requests?success=${encodeURIComponent(
        "Payment reference submitted. Waiting for lender verification."
      )}`
    );
  } catch (error) {
    try {
      const transaction =
        await getPaymentDetails(
          req.session.user.id,
          req.params.transactionId
        );

      const upiUri =
        process.env.UPI_ID
          ? buildUpiUri({
              upiId:
                process.env.UPI_ID,
              payeeName:
                process.env.UPI_PAYEE_NAME ||
                "Campus Exchange",
              amount:
                transaction.securityDeposit,
              transactionId:
                transaction._id.toString(),
              equipmentName:
                transaction.equipment
                  ?.name ||
                "Equipment"
            })
          : null;

      const qrCodeDataUrl =
        upiUri
          ? await QRCode.toDataURL(
              upiUri,
              {
                width: 300,
                margin: 2,
                errorCorrectionLevel:
                  "M"
              }
            )
          : null;

      return res
        .status(
          error.statusCode || 400
        )
        .render(
          "borrow/payment",
          {
            title:
              "Security Deposit Payment",
            transaction,
            upiUri,
            qrCodeDataUrl,
            error:
              error.message
          }
        );
    } catch (renderError) {
      next(renderError);
    }
  }
}

module.exports = {
  renderPayment,
  submitPayment
};
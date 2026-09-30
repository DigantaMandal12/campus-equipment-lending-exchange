const {
  createBorrowRequest,
  getMyBorrowRequests
} = require("../services/borrowService");

const {
  getEquipmentById
} = require("../services/equipmentService");


/*
 * =====================================================
 * RENDER BORROW REQUEST PAGE
 * =====================================================
 */
async function renderBorrowRequest(
  req,
  res,
  next
) {
  try {
    const equipment =
      await getEquipmentById(
        req.params.equipmentId
      );

    return res.render(
      "borrow/request",
      {
        title:
          `Borrow ${equipment.name}`,

        equipment,

        error: null,

        formData: {
          quantity:
            req.query.quantity || "1",

          requestedReturnDate:
            req.query.requestedReturnDate ||
            ""
        }
      }
    );
  } catch (error) {
    next(error);
  }
}


/*
 * =====================================================
 * CREATE BORROW REQUEST
 * =====================================================
 */
async function createRequest(
  req,
  res,
  next
) {
  try {
    await createBorrowRequest(
      req.session.user.id,
      req.params.equipmentId,
      req.body
    );

    return res.redirect(
      `/borrow/my-requests?success=${encodeURIComponent(
        "Borrow request submitted successfully."
      )}`
    );
  } catch (error) {
    try {
      const equipment =
        await getEquipmentById(
          req.params.equipmentId
        );

      return res
        .status(400)
        .render(
          "borrow/request",
          {
            title:
              `Borrow ${equipment.name}`,

            equipment,

            error:
              error.message,

            formData: {
              quantity:
                req.body.quantity ||
                "1",

              requestedReturnDate:
                req.body.requestedReturnDate ||
                ""
            }
          }
        );
    } catch (renderError) {
      next(renderError);
    }
  }
}


/*
 * =====================================================
 * SHOW BORROWER REQUESTS
 * =====================================================
 */
async function myRequests(
  req,
  res,
  next
) {
  try {
    const requests =
      await getMyBorrowRequests(
        req.session.user.id
      );

    return res.render(
      "borrow/my-requests",
      {
        title:
          "My Borrow Requests",

        requests,

        success:
          req.query.success ||
          null
      }
    );
  } catch (error) {
    next(error);
  }
}


/*
 * =====================================================
 * EXPORT CONTROLLERS
 * =====================================================
 */
module.exports = {
  renderBorrowRequest,
  createRequest,
  myRequests
};
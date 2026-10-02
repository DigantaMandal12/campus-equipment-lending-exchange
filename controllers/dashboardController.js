const {
  getAdminDashboardData,
  getLenderDashboardData,
  getBorrowerDashboardData
} = require("../services/dashboardService");

function showDashboardRouter(
  req,
  res
) {
  const {
    role
  } = req.session.user;

  switch (role) {
    case "ADMIN":
      return res.redirect(
        "/dashboard/admin"
      );

    case "LENDER":
      return res.redirect(
        "/dashboard/lender"
      );

    case "BORROWER":
      return res.redirect(
        "/dashboard/borrower"
      );

    default:
      return res.status(403).render(
        "errors/500",
        {
          title: "Access Denied",
          message:
            "Your account has an invalid role."
        }
      );
  }
}

async function adminDashboard(
  req,
  res,
  next
) {
  try {
    const stats =
      await getAdminDashboardData();

    return res.render(
      "admin/dashboard",
      {
        title: "Admin Dashboard",
        stats
      }
    );
  } catch (error) {
    next(error);
  }
}

async function lenderDashboard(
  req,
  res,
  next
) {
  try {
    const stats =
      await getLenderDashboardData(
        req.session.user.id
      );

    return res.render(
      "lender/dashboard",
      {
        title: "Lender Dashboard",
        stats,
        currentUser:
          req.session.user
      }
    );
  } catch (error) {
    next(error);
  }
}

async function borrowerDashboard(
  req,
  res,
  next
) {
  try {
    const stats =
      await getBorrowerDashboardData(
        req.session.user.id
      );

    return res.render(
      "borrower/dashboard",
      {
        title: "Borrower Dashboard",
        stats,
        currentUser:
          req.session.user
      }
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  showDashboardRouter,
  adminDashboard,
  lenderDashboard,
  borrowerDashboard
};
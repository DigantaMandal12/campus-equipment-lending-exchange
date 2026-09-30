function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect(
        "/auth/login?error=Please+login+to+continue"
      );
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).render("errors/500", {
        title: "Access Denied",
        message: "You do not have permission to access this page."
      });
    }

    next();
  };
}

module.exports = requireRole;
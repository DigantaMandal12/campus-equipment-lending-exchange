function attachCurrentUser(req, res, next) {
  res.locals.currentUser =
    req.session?.user || null;

  next();
}

function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.redirect(
      "/auth/login?error=Please+login+to+continue"
    );
  }

  next();
}

function requireGuest(req, res, next) {
  if (req.session?.user) {
    return res.redirect("/");
  }

  next();
}

module.exports = {
  attachCurrentUser,
  requireAuth,
  requireGuest
};
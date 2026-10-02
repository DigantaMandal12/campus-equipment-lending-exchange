function notFoundHandler(req, res) {
  res.status(404).render("errors/404", {
    title: "Page Not Found",
    requestedUrl: req.originalUrl
  });
}

function errorHandler(err, req, res, next) {
  console.error(err);

  const statusCode =
    Number.isInteger(err.statusCode)
      ? err.statusCode
      : 500;

  const isProduction =
    process.env.NODE_ENV === "production";

  if (req.accepts("json")) {
    return res.status(statusCode).json({
      success: false,
      message:
        isProduction && statusCode === 500
          ? "An internal server error occurred."
          : err.message || "Something went wrong."
    });
  }

  return res.status(statusCode).render("errors/500", {
    title: "Server Error",
    message:
      isProduction && statusCode === 500
        ? "Something went wrong on the server."
        : err.message || "Something went wrong."
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
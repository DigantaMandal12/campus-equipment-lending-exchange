// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log the full technical error to server console for debugging
  console.error('[SERVER ERROR]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });

  const statusCode = err.status || err.statusCode || 500;
  let userFriendlyMessage = 'Something went wrong. Please try again.';

  if (statusCode === 404) {
    userFriendlyMessage = 'The page or resource you are looking for was not found.';
  } else if (statusCode === 403) {
    userFriendlyMessage = 'You do not have permission to perform this action.';
  } else if (statusCode === 401) {
    userFriendlyMessage = 'Please sign in to proceed.';
  } else if (err.name === 'ValidationError') {
    userFriendlyMessage = Object.values(err.errors).map(val => val.message).join(', ') || 'Invalid form input provided.';
  } else if (err.code === 11000) {
    userFriendlyMessage = 'An account with this email address already exists.';
  } else if (err.message && !err.message.includes('Mongoose') && !err.message.includes('SQL')) {
    userFriendlyMessage = err.message;
  }

  // Handle JSON / AJAX requests
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    return res.status(statusCode).json({
      success: false,
      message: userFriendlyMessage
    });
  }

  // Render friendly EJS error page
  return res.status(statusCode).render('error', {
    title: 'Error',
    statusCode,
    message: userFriendlyMessage,
    activePath: req.path
  });
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res, next) => {
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }
  return res.status(404).render('error', {
    title: 'Page Not Found',
    statusCode: 404,
    message: 'The page you requested could not be found.',
    activePath: req.path
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};

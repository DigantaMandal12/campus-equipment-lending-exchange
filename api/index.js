const app = require('../app');

module.exports = (req, res) => {
  const forwardedUri = req.headers['x-forwarded-uri'] || req.headers['x-original-url'];
  if (forwardedUri && !forwardedUri.startsWith('/api/index')) {
    req.url = forwardedUri;
  } else {
    const matched = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'];
    if (matched && !matched.startsWith('/api/index') && !matched.startsWith('/api')) {
      req.url = matched;
    } else if (req.url === '/api/index' || req.url === '/api/index.js' || req.url === '/api') {
      req.url = '/';
    } else if (req.url.startsWith('/api/index/')) {
      req.url = req.url.replace(/^\/api\/index/, '') || '/';
    } else if (req.url.startsWith('/api/')) {
      req.url = req.url.replace(/^\/api/, '') || '/';
    }
  }

  return app(req, res);
};